from __future__ import annotations

import csv
import io
import os
import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Dict, List

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, F, IntegerField, Count, Q
from django.db.models.functions import Coalesce
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from django.utils import timezone
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core import signing

from .filters import ProductFilter
from .models import (
    Product,
    Category,
    Supplier,
    Inventory,
    Order,
    OrderItem,
    Review,
    ReviewMedia,
    Address,
    Coupon,
    CouponRedemption,
    OrderStatusEvent,
    Notification,
    Bundle,
    BundleItem,
    ProductVariant,
    SizeGuide,
    ContentPage,
    Wishlist,
)
from .permissions import IsAdminOrReadOnly, IsAdmin, IsOwner, user_has_role
from .serializers import (
    ProductSerializer,
    ProductWriteSerializer,
    CategorySerializer,
    SupplierSerializer,
    OrderSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    UserSerializer,
    RegisterSerializer,
    AddressSerializer,
    BundleSerializer,
    ContentPageSerializer,
)
from .payments.base import get_gateway
from .models import Payment as PaymentModel
from .tasks import auto_forward_order_to_supplier, sync_supplier_products
from .metrics import PAYMENT_FAILURES
from .services.cart import CartService, SavedCartService
from .services.audit import record_admin_action
from .emails import send_order_notification
import requests


User = get_user_model()


class ProductViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_field = "slug"
    filterset_class = ProductFilter
    search_fields = ["title", "sku"]
    ordering_fields = ["base_price", "created_at", "avg_rating", "title"]
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return (
            Product.objects.filter(is_deleted=False, active=True)
            .select_related("category", "supplier", "category__size_guide")
            .prefetch_related("variants")
            .annotate(
                avg_rating=Avg("reviews__rating"),
                stock_qty=Coalesce(F("inventory__quantity"), 0, output_field=IntegerField()),
            )
            .order_by("-created_at")
        )

    @action(detail=True, methods=["get"], permission_classes=[AllowAny], url_path="recommendations")
    def recommendations(self, request, slug=None, *args, **kwargs):
        product = self.get_object()
        base_qs = self.get_queryset()
        related = (
            base_qs.filter(order_items__order__items__product=product)
            .exclude(id=product.id)
            .annotate(freq=Count("order_items__id"))
            .order_by("-freq", "-avg_rating")
        )
        if not related.exists():
            related = base_qs.filter(category=product.category).exclude(id=product.id).order_by("-avg_rating", "-created_at")
        serializer = self.get_serializer(related[:8], many=True)
        return Response(serializer.data)


class BundleViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Bundle.objects.filter(active=True).prefetch_related(
        "items__product__variants",
        "items__product__category",
        "items__product__supplier",
    )
    serializer_class = BundleSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        qs = super().get_queryset()
        bundle_type = self.request.query_params.get("type")
        if bundle_type:
            qs = qs.filter(bundle_type=bundle_type)
        now = timezone.now()
        qs = qs.filter(
            Q(starts_at__isnull=True) | Q(starts_at__lte=now),
            Q(ends_at__isnull=True) | Q(ends_at__gte=now),
        )
        return qs.order_by("-created_at")


class ContentPageViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = ContentPage.objects.filter(is_active=True)
    serializer_class = ContentPageSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
class CategoryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by("name")
    serializer_class = SupplierSerializer
    permission_classes = [IsAdmin]

    @action(detail=True, methods=["post"], url_path="sync")
    def sync(self, request, pk=None):
        supplier = self.get_object()
        sync_supplier_products.delay(supplier.id)
        supplier.last_synced_at = timezone.now()
        supplier.save(update_fields=["last_synced_at"])
        return Response({"ok": True, "supplier_id": supplier.id, "last_synced_at": supplier.last_synced_at})


class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related("category", "supplier")
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        return ProductSerializer

    @action(detail=False, methods=["post"], url_path="bulk-import")
    def bulk_import(self, request):
        csv_text = request.data.get("csv")
        if not csv_text and "file" in request.FILES:
            csv_text = request.FILES["file"].read().decode("utf-8")
        if not csv_text:
            return Response({"detail": "CSV content required"}, status=400)
        reader = csv.DictReader(io.StringIO(csv_text))
        created = 0
        for row in reader:
            title = row.get("title")
            sku = row.get("sku")
            price = Decimal(row.get("price", "0"))
            cat_name = row.get("category", "General")
            category, _ = Category.objects.get_or_create(name=cat_name, defaults={"slug": slugify(cat_name)})
            obj, was_created = Product.objects.get_or_create(
                sku=sku,
                defaults={
                    "title": title or sku,
                    "slug": slugify(title or sku),
                    "base_price": price,
                    "category": category,
                },
            )
            created += 1 if was_created else 0
        return Response({"created": created})

    @action(detail=False, methods=["post"], url_path="sync")
    def sync(self, request):
        return Response({"status": "sync triggered"}, status=202)


class ReviewsViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Review.objects.all().select_related("product", "user").prefetch_related("media")
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method in ("GET", "HEAD"):
            return ReviewSerializer
        return ReviewCreateSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        verified = self._is_verified_purchase(self.request.user, product)
        review = serializer.save(user=self.request.user, verified_purchase=verified)
        for image in self.request.FILES.getlist("images"):
            ReviewMedia.objects.create(review=review, image=image)
        self._serializer_instance = review

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        instance = getattr(self, "_serializer_instance", None) or serializer.instance
        data = ReviewSerializer(instance).data if instance else {}
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    @staticmethod
    def _is_verified_purchase(user, product):
        return OrderItem.objects.filter(order__user=user, product=product, order__status__in=[Order.Status.PAID, Order.Status.PROCESSING, Order.Status.SHIPPED, Order.Status.DELIVERED]).exists()


class OrdersViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.select_related("user", "shipping_address", "billing_address").prefetch_related("items__product")
        if user_has_role(self.request.user, {User.Role.ADMIN, User.Role.STAFF}):
            return qs
        return qs.filter(user=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        # Only admins can patch status
        if not user_has_role(request.user, {User.Role.ADMIN, User.Role.STAFF}):
            return Response({"detail": "Forbidden"}, status=403)
        return super().partial_update(request, *args, **kwargs)


class OrderTrackingView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        order_id = request.data.get("order_id")
        email = (request.data.get("email") or "").strip().lower()
        if not order_id or not email:
            return Response({"detail": "order_id and email are required"}, status=status.HTTP_400_BAD_REQUEST)
        order = (
            Order.objects.select_related("user", "shipping_address", "billing_address", "coupon", "referral_coupon")
            .prefetch_related("items__product", "events", "return_requests")
            .filter(id=order_id, user__email__iexact=email)
            .first()
        )
        if not order:
            return Response({"detail": "No matching order"}, status=status.HTTP_404_NOT_FOUND)
        data = OrderSerializer(order).data
        return Response(data)


class AddressesViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by('-id')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


## CartService moved to services.cart module


class CartView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cart = CartService.get(request)
        items = []
        total = Decimal("0.00")
        pruned = False
        for pid, qty in list(cart.items()):
            try:
                p = Product.objects.get(id=pid, is_deleted=False, active=True)
            except Product.DoesNotExist:
                cart.pop(pid, None)
                pruned = True
                continue
            inv_qty = (
                Inventory.objects.filter(product_id=pid)
                .values_list("quantity", flat=True)
                .first()
            )
            if inv_qty is not None and inv_qty <= 0:
                cart.pop(pid, None)
                pruned = True
                continue
            items.append({
                "product": {"id": p.id, "sku": p.sku, "title": p.title},
                "quantity": qty,
                "unit_price": str(p.base_price),
            })
            total += p.base_price * qty
        if pruned:
            CartService.set(request, cart)
        resp = Response({"items": items, "total": str(total)})
        if not request.user.is_authenticated and CartService.COOKIE_NAME not in request.COOKIES:
            key = CartService._key(request).split(":", 1)[1]
            resp.set_cookie(CartService.COOKIE_NAME, key, max_age=60 * 60 * 24 * 30)
        return resp

    def post(self, request):
        product_id = int(request.data.get("product_id"))
        quantity = max(1, int(request.data.get("quantity", 1)))
        product = get_object_or_404(Product, id=product_id, active=True, is_deleted=False)
        inv = Inventory.objects.filter(product=product).first()
        available = inv.quantity if inv else 0
        if available <= 0:
            return Response({"detail": "Product currently out of stock"}, status=400)
        cart = CartService.get(request)
        new_qty = cart.get(product_id, 0) + quantity
        if new_qty > available:
            return Response({"detail": f"Only {available} units available"}, status=400)
        cart[product_id] = new_qty
        CartService.set(request, cart)
        # Ensure guest users receive a durable cart cookie even when their first
        # interaction is a write (POST), not a read (GET). This prevents cart
        # loss on login because the merge relies on the cookie key.
        resp = self.get(request)
        if not request.user.is_authenticated and CartService.COOKIE_NAME not in request.COOKIES:
            key = CartService._key(request).split(":", 1)[1]
            resp.set_cookie(CartService.COOKIE_NAME, key, max_age=60 * 60 * 24 * 30)
        return resp

    def patch(self, request):
        product_id = int(request.data.get("product_id"))
        quantity = int(request.data.get("quantity", 1))
        cart = CartService.get(request)
        if quantity <= 0:
            cart.pop(product_id, None)
        else:
            inv = Inventory.objects.filter(product_id=product_id).first()
            available = inv.quantity if inv else 0
            if available <= 0:
                cart.pop(product_id, None)
                CartService.set(request, cart)
                return Response({"detail": "Product currently out of stock"}, status=400)
            if quantity > available:
                return Response({"detail": f"Only {available} units available"}, status=400)
            cart[product_id] = quantity
        CartService.set(request, cart)
        resp = self.get(request)
        if not request.user.is_authenticated and CartService.COOKIE_NAME not in request.COOKIES:
            key = CartService._key(request).split(":", 1)[1]
            resp.set_cookie(CartService.COOKIE_NAME, key, max_age=60 * 60 * 24 * 30)
        return resp

    def delete(self, request):
        product_id = int(request.data.get("product_id"))
        cart = CartService.get(request)
        cart.pop(product_id, None)
        CartService.set(request, cart)
        resp = self.get(request)
        if not request.user.is_authenticated and CartService.COOKIE_NAME not in request.COOKIES:
            key = CartService._key(request).split(":", 1)[1]
            resp.set_cookie(CartService.COOKIE_NAME, key, max_age=60 * 60 * 24 * 30)
        return resp


class CartSaveForLaterView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(self._payload(request))

    def post(self, request):
        try:
            product_id = int(request.data.get("product_id"))
        except (TypeError, ValueError):
            return Response({"detail": "product_id required"}, status=status.HTTP_400_BAD_REQUEST)
        cart = CartService.get(request)
        qty = cart.pop(product_id, None)
        if qty is None:
            return Response({"detail": "Item not in cart"}, status=status.HTTP_400_BAD_REQUEST)
        CartService.set(request, cart)
        saved = SavedCartService.get(request)
        saved[product_id] = qty
        SavedCartService.set(request, saved)
        if getattr(request, "user", None) and request.user.is_authenticated:
            wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
            wishlist.products.add(product_id)
        return Response(self._payload(request), status=status.HTTP_201_CREATED)

    def delete(self, request):
        try:
            product_id = int(request.data.get("product_id"))
        except (TypeError, ValueError):
            return Response({"detail": "product_id required"}, status=status.HTTP_400_BAD_REQUEST)
        saved = SavedCartService.get(request)
        if product_id in saved:
            saved.pop(product_id)
            SavedCartService.set(request, saved)
        return Response(self._payload(request))

    def _payload(self, request):
        saved = SavedCartService.get(request)
        ids = list(saved.keys())
        try:
            ids = [int(pid) for pid in ids]
        except ValueError:
            ids = [int(pid) for pid in saved.keys() if str(pid).isdigit()]
        products = (
            Product.objects.filter(id__in=ids, active=True, is_deleted=False)
            .select_related("category", "supplier", "category__size_guide")
            .prefetch_related("variants")
            .annotate(
                avg_rating=Avg("reviews__rating"),
                stock_qty=Coalesce(F("inventory__quantity"), 0, output_field=IntegerField()),
            )
        )
        serialized = {product.id: ProductSerializer(product).data for product in products}
        items = [
            {"product": serialized.get(int(pid)), "quantity": qty}
            for pid, qty in saved.items()
            if serialized.get(int(pid))
        ]
        return {"items": items}


class CartClearView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Clear current cart (user or guest) and also clear any guest cart by cookie
        CartService.clear(request)
        SavedCartService.clear(request)
        cookie_key = request.COOKIES.get(CartService.COOKIE_NAME)
        if cookie_key:
            try:
                cache.delete(f"cart:{cookie_key}")
            except Exception:
                pass
        resp = Response({"items": [], "total": "0.00"})
        if cookie_key:
            resp.delete_cookie(CartService.COOKIE_NAME)
        return resp

class CheckoutView(APIView):
    # Require login to checkout
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        cart = CartService.get(request)
        if not cart:
            return Response({"detail": "Cart is empty"}, status=400)

        user = request.user

        # Accept either IDs or address dicts; create Address when dicts are provided
        shipping_raw = request.data.get("shipping_address")
        billing_raw = request.data.get("billing_address") or shipping_raw
        if shipping_raw is None:
            return Response({"detail": "shipping_address is required"}, status=400)

        def _ensure_address(raw):
            if isinstance(raw, int) or (isinstance(raw, str) and raw.isdigit()):
                return int(raw)
            if isinstance(raw, dict):
                normalized = dict(raw)
                country = normalized.get("country")
                if country:
                    normalized["country"] = str(country).strip().upper()[:2]
                else:
                    normalized["country"] = "NP"
                ser = AddressSerializer(data=normalized)
                ser.is_valid(raise_exception=True)
                addr = Address.objects.create(user=user, **ser.validated_data)
                return addr.id
            return None

        shipping_address_id = _ensure_address(shipping_raw)
        billing_address_id = _ensure_address(billing_raw)
        if not (shipping_address_id and billing_address_id):
            return Response({"detail": "Invalid address payload"}, status=400)

        total = Decimal("0.00")
        max_shipping_days = 0

        # First pass: lock and validate inventory before creating the Order record
        locked = []
        for pid, qty in list(cart.items()):
            product = get_object_or_404(Product, id=pid, is_deleted=False, active=True)
            inv, _ = Inventory.objects.get_or_create(product=product, defaults={"quantity": 0})
            inv = Inventory.objects.select_for_update().get(pk=inv.pk)
            if inv.quantity < qty:
                cart.pop(pid, None)
                CartService.set(request, cart)
                message = "Product currently out of stock" if inv.quantity <= 0 else f"Only {inv.quantity} units available for {product.sku}"
                return Response({"detail": message}, status=400)
            locked.append((product, inv, qty))

        if not locked:
            return Response({"detail": "Cart is empty"}, status=400)

        order = Order.objects.create(
            user=user,
            status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
            total_amount=Decimal("0.00"),
            shipping_address_id=shipping_address_id,
            billing_address_id=billing_address_id,
            shipping_method=request.data.get("shipping_method", "Standard"),
        )

        # Second pass: create items and deduct
        for product, inv, qty in locked:
            OrderItem.objects.create(order=order, product=product, unit_price=product.base_price, quantity=qty)
            inv.quantity -= qty
            inv.save(update_fields=["quantity"])
            total += product.base_price * qty
            max_shipping_days = max(max_shipping_days, product.shipping_time_max_days)

        coupon_code = (request.data.get("coupon_code") or request.data.get("coupon") or "").strip()
        referral_code = (request.data.get("referral_code") or "").strip()
        applied_coupon = None
        referral_coupon = None
        discount_amount = Decimal("0.00")

        if coupon_code:
            applied_coupon = Coupon.objects.filter(code__iexact=coupon_code, is_active=True, is_referral=False).first()
            if not applied_coupon:
                return Response({"detail": "Invalid coupon"}, status=400)
            if applied_coupon.expires_at and timezone.now() > applied_coupon.expires_at:
                return Response({"detail": "Coupon expired"}, status=400)
            if applied_coupon.min_order_total and total < applied_coupon.min_order_total:
                return Response({"detail": "Order total does not meet coupon minimum"}, status=400)
            if applied_coupon.usage_limit and applied_coupon.redemptions.count() >= applied_coupon.usage_limit:
                return Response({"detail": "Coupon usage limit reached"}, status=400)
            if applied_coupon.per_user_limit and applied_coupon.redemptions.filter(user=user).count() >= applied_coupon.per_user_limit:
                return Response({"detail": "Coupon already redeemed"}, status=400)
            if applied_coupon.discount_type == Coupon.DiscountType.PERCENT:
                discount_amount = (total * applied_coupon.value / Decimal("100"))
            else:
                discount_amount = Decimal(applied_coupon.value)
            discount_amount = min(discount_amount, total).quantize(Decimal("0.01"))

        if referral_code:
            if coupon_code and referral_code.lower() == coupon_code.lower():
                return Response({"detail": "Referral code must differ from coupon"}, status=400)
            referral_coupon = Coupon.objects.filter(code__iexact=referral_code, is_active=True, is_referral=True).first()
            if not referral_coupon:
                return Response({"detail": "Invalid referral code"}, status=400)
            if referral_coupon.expires_at and timezone.now() > referral_coupon.expires_at:
                return Response({"detail": "Referral code expired"}, status=400)
            if referral_coupon.usage_limit and referral_coupon.redemptions.count() >= referral_coupon.usage_limit:
                return Response({"detail": "Referral code limit reached"}, status=400)
            if referral_coupon.per_user_limit and referral_coupon.redemptions.filter(user=user).count() >= referral_coupon.per_user_limit:
                return Response({"detail": "Referral already used"}, status=400)
            referral_discount = Decimal("0.00")
            if referral_coupon.discount_type == Coupon.DiscountType.PERCENT:
                referral_discount = total * referral_coupon.value / Decimal("100")
            else:
                referral_discount = Decimal(referral_coupon.value)
            referral_discount = min(referral_discount, total).quantize(Decimal("0.01"))
            discount_amount += referral_discount

        payable_total = max(total - discount_amount, Decimal("0.00")).quantize(Decimal("0.01"))

        order.total_amount = payable_total
        order.discount_amount = discount_amount
        update_fields = ["total_amount", "discount_amount", "estimated_delivery_at", "shipping_method", "payment_status"]
        if applied_coupon:
            order.coupon = applied_coupon
            update_fields.append("coupon")
        if referral_coupon:
            order.referral_coupon = referral_coupon
            update_fields.append("referral_coupon")
        if max_shipping_days:
            order.estimated_delivery_at = timezone.now() + timedelta(days=max_shipping_days)
        order.save(update_fields=update_fields)
        OrderStatusEvent.objects.create(order=order, status=Order.Status.PENDING, note="Order created")
        Notification.objects.create(
            user=user,
            notification_type=Notification.Type.ORDER_UPDATE,
            payload={"order_id": order.id, "status": order.status},
        )

        # Clear cart after checkout
        CartService.set(request, {})
        SavedCartService.set(request, {})

        provider = (request.data.get("provider") or "esewa").lower()

        if provider == "cod":
            PaymentModel.objects.create(
                order=order,
                provider=PaymentModel.Provider.COD,
                provider_payment_id=f"cod_{order.id}_{uuid.uuid4().hex[:6]}",
                amount=order.total_amount,
                status=PaymentModel.Status.PENDING,
                raw_response={"method": "cod"},
            )
            order.status = Order.Status.PROCESSING
            order.payment_status = Order.PaymentStatus.PENDING
            order.save(update_fields=["status", "payment_status"])
            OrderStatusEvent.objects.create(order=order, status=Order.Status.PROCESSING, note="Awaiting COD delivery")
            send_order_notification(order)
            return Response(
                {
                    "order_id": order.id,
                    "payment_intent": {
                        "provider": provider,
                        "status": "pending",
                        "message": "Cash on delivery selected. Please prepare exact change at delivery.",
                    },
                },
                status=201,
            )

        try:
            gateway = get_gateway(provider)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)
        if order.total_amount <= Decimal("0.00"):
            order.status = Order.Status.PAID
            order.payment_status = Order.PaymentStatus.PAID
            order.save(update_fields=["status", "payment_status"])
            OrderStatusEvent.objects.create(order=order, status=Order.Status.PAID, note="Zero-balance order")
            Notification.objects.create(
                user=user,
                notification_type=Notification.Type.ORDER_UPDATE,
                payload={"order_id": order.id, "status": order.status},
            )
            send_order_notification(order)
            try:
                auto_forward_order_to_supplier.delay(order.id)
            except Exception:
                pass
            return Response({"order_id": order.id, "payment_intent": None}, status=201)

        origin = request.headers.get("Origin") or request.META.get("HTTP_ORIGIN")
        if not origin:
            referer = request.headers.get("Referer") or request.META.get("HTTP_REFERER")
            if referer:
                from urllib.parse import urlparse

                parsed = urlparse(referer)
                if parsed.scheme and parsed.netloc:
                    origin = f"{parsed.scheme}://{parsed.netloc}"

        intent = gateway.create_payment_intent(order, frontend_origin=origin, request=request)

        # Create Payment record
        payment_amount = order.total_amount
        if provider == "esewa":
            try:
                payment_amount = Decimal(str(intent.get("amount_npr") or intent.get("base_amount_npr") or order.total_amount))
            except Exception:
                payment_amount = order.total_amount

        PaymentModel.objects.create(
            order=order,
            provider=provider,
            provider_payment_id=intent.get("provider_payment_id") or intent.get("token") or f"{provider}_{uuid.uuid4().hex[:8]}",
            amount=payment_amount,
            status=PaymentModel.Status.PENDING,
            raw_response=intent,
        )

        send_order_notification(order)

        return Response({"order_id": order.id, "payment_intent": {"provider": provider, **intent}}, status=201)


class PaymentsVerifyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        provider = (request.query_params.get("provider") or "").lower()
        order_id = request.query_params.get("order_id")
        if not (provider and order_id):
            return Response({"detail": "provider and order_id are required"}, status=400)
        order = get_object_or_404(Order, id=order_id)

        payment = PaymentModel.objects.filter(order=order, provider=provider).first()

        normalized_extra = {}

        try:
            if provider == "esewa":
                # eSewa verify: transrec?amt=<amt>&scd=<merchant_code>&pid=<order_id or pid>&rid=<refId>
                amt = request.query_params.get("amt")
                if not amt and payment:
                    amt = str(payment.amount)
                if not amt:
                    amt = str(order.total_amount)
                ref_id = request.query_params.get("refId") or request.query_params.get("rid")
                pid = request.query_params.get("pid") or (payment.provider_payment_id if payment and payment.provider_payment_id else str(order.id))
                merchant = os.environ.get("ESEWA_MERCHANT_ID", "merchant")
                if not ref_id:
                    return Response({"detail": "refId (rid) required for eSewa verify"}, status=400)
                verify_url = os.environ.get("ESEWA_VERIFY_URL", "https://uat.esewa.com.np/epay/transrec")
                resp = requests.get(verify_url, params={"amt": amt, "scd": merchant, "pid": pid, "rid": ref_id}, timeout=15)
                ok = resp.status_code == 200 and "Success" in resp.text
                provider_payment_id = payment.provider_payment_id if payment and payment.provider_payment_id else pid
                normalized_extra = {"ref_id": ref_id, "amount": amt, "transaction_id": ref_id}
            elif provider == "khalti":
                # Khalti verify: POST token + amount (in paisa)
                token = request.query_params.get("token")
                amount_rs = request.query_params.get("amount") or str(order.total_amount)
                if not token:
                    return Response({"detail": "token required for khalti verify"}, status=400)
                try:
                    paisa = int(Decimal(amount_rs) * 100)
                except Exception:
                    paisa = int(order.total_amount * 100)
                verify_url = os.environ.get("KHALTI_VERIFY_URL", "https://khalti.com/api/v2/payment/verify/")
                headers = {"Authorization": f"Key {os.environ.get('KHALTI_SECRET','test_secret')}"}
                resp = requests.post(verify_url, json={"token": token, "amount": paisa}, headers=headers, timeout=20)
                ok = resp.status_code in (200, 201)
                provider_payment_id = token
            elif provider == "stripe":
                intent_id = request.query_params.get("payment_intent") or request.query_params.get("provider_payment_id")
                if not intent_id:
                    return Response({"detail": "payment_intent is required"}, status=400)
                try:
                    gateway = get_gateway("stripe")
                except Exception as exc:
                    return Response({"detail": str(exc)}, status=400)
                status_data = gateway.fetch_payment_status(intent_id)
                remote_status = (status_data.get("status") or "").lower()
                ok = remote_status in ("succeeded", "paid")
                provider_payment_id = intent_id
            elif provider == "paypal":
                paypal_order_id = request.query_params.get("token") or request.query_params.get("paypal_order_id") or request.query_params.get("provider_payment_id")
                if not paypal_order_id:
                    return Response({"detail": "token required for PayPal verify"}, status=400)
                try:
                    gateway = get_gateway("paypal")
                except Exception as exc:
                    return Response({"detail": str(exc)}, status=400)
                capture_response = gateway.capture(paypal_order_id)
                status_value = getattr(capture_response.result, "status", "")
                ok = status_value in ("COMPLETED", "APPROVED")
                provider_payment_id = getattr(capture_response.result, "id", paypal_order_id)
            else:
                return Response({"detail": "Unsupported provider"}, status=400)

            payment = PaymentModel.objects.filter(order=order, provider=provider).first()
            if not payment:
                payment = PaymentModel.objects.create(order=order, provider=provider, provider_payment_id=provider_payment_id, amount=order.total_amount, status=PaymentModel.Status.PENDING)

            if ok:
                payment.status = PaymentModel.Status.SUCCEEDED
                payload = {"status": "succeeded", "provider_payment_id": provider_payment_id}
                payload.update(normalized_extra)
                payment.raw_response = {**(payment.raw_response or {}), **payload}
                payment.save(update_fields=["status", "raw_response"])
                order.status = Order.Status.PAID
                order.payment_status = Order.PaymentStatus.PAID
                order.save(update_fields=["status", "payment_status"])
                OrderStatusEvent.objects.create(order=order, status=Order.Status.PAID, note="Payment verified")
                if order.coupon:
                    CouponRedemption.objects.get_or_create(order=order, coupon=order.coupon, user=order.user)
                if order.referral_coupon:
                    CouponRedemption.objects.get_or_create(order=order, coupon=order.referral_coupon, user=order.user)
                Notification.objects.create(
                    user=order.user,
                    notification_type=Notification.Type.ORDER_UPDATE,
                    payload={"order_id": order.id, "status": order.status},
                )
                try:
                    auto_forward_order_to_supplier.delay(order.id)
                except Exception:
                    pass
                return Response({"ok": True, "order_id": order.id, "provider": provider, "provider_payment_id": provider_payment_id})
            else:
                payment.status = PaymentModel.Status.FAILED
                payment.raw_response = {**(payment.raw_response or {}), "status": "failed", **normalized_extra}
                payment.save(update_fields=["status", "raw_response"])
                order.payment_status = Order.PaymentStatus.FAILED
                order.save(update_fields=["payment_status"])
                return Response({"ok": False, "order_id": order.id, "provider": provider}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=500)


class PaymentsWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        provider = (request.data.get("provider") or request.query_params.get("provider") or "").lower()
        order_id = request.data.get("order_id") or request.query_params.get("order_id")
        order = get_object_or_404(Order, id=order_id)

        gateway = get_gateway(provider)
        payload = request.data
        if hasattr(payload, "dict"):
            payload = payload.dict()
        if isinstance(payload, list):
            payload_data = {"data": payload}
        else:
            payload_data = dict(payload)
        normalized_payload = {}
        for key, value in payload_data.items():
            if isinstance(value, list) and len(value) == 1:
                normalized_payload[key] = value[0]
            else:
                normalized_payload[key] = value
        payload_data = normalized_payload
        try:
            raw_body = request.body.decode("utf-8") if hasattr(request, "body") else None
        except Exception:
            raw_body = None
        headers = {key: value for key, value in request.headers.items()}
        if raw_body:
            headers["X-Raw-Body"] = raw_body
        ok, normalized = gateway.verify_webhook(payload_data, headers)

        # Find the existing payment
        provider_payment_id = normalized.get("provider_payment_id") or request.data.get("provider_payment_id")
        payment = PaymentModel.objects.filter(order=order, provider=provider).first()
        if not payment and provider_payment_id:
            payment = PaymentModel.objects.filter(provider_payment_id=provider_payment_id).first()

        if ok:
            if payment:
                payment.status = PaymentModel.Status.SUCCEEDED
                payment.raw_response = {**(payment.raw_response or {}), **normalized}
                payment.save(update_fields=["status", "raw_response"])
            order.status = Order.Status.PAID
            order.payment_status = Order.PaymentStatus.PAID
            order.save(update_fields=["status", "payment_status"])
            OrderStatusEvent.objects.create(order=order, status=Order.Status.PAID, note="Gateway webhook")
            if order.coupon:
                CouponRedemption.objects.get_or_create(order=order, coupon=order.coupon, user=order.user)
            if order.referral_coupon:
                CouponRedemption.objects.get_or_create(order=order, coupon=order.referral_coupon, user=order.user)
            Notification.objects.create(
                user=order.user,
                notification_type=Notification.Type.ORDER_UPDATE,
                payload={"order_id": order.id, "status": order.status},
            )
            try:
                auto_forward_order_to_supplier.delay(order.id)
            except Exception:
                pass
        else:
            order.payment_status = Order.PaymentStatus.FAILED
            order.save(update_fields=["payment_status"])
            PAYMENT_FAILURES.labels(provider=provider or "unknown").inc()
        return Response({"ok": ok})


class PaymentRefundView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        if not user_has_role(request.user, {User.Role.ADMIN, User.Role.STAFF}):
            record_admin_action(
                actor=request.user,
                request=request,
                resource="payment",
                action="refund",
                object_pk=str(pk),
                status="failure",
                metadata={"reason": "forbidden"},
            )
            return Response({"detail": "Forbidden"}, status=403)
        payment = get_object_or_404(PaymentModel, pk=pk)
        gateway = get_gateway(payment.provider)
        amount = request.data.get("amount") or payment.amount
        try:
            res = gateway.handle_refund(payment.order, amount)
        except NotImplementedError:
            record_admin_action(
                actor=request.user,
                request=request,
                resource="payment",
                action="refund",
                object_pk=str(payment.pk),
                status="failure",
                metadata={"reason": "not_supported", "provider": payment.provider},
            )
            return Response({"detail": "Refund not supported for this provider."}, status=400)
        except Exception as exc:  # noqa: broad-except
            record_admin_action(
                actor=request.user,
                request=request,
                resource="payment",
                action="refund",
                object_pk=str(payment.pk),
                status="failure",
                metadata={"error": str(exc)},
            )
            return Response({"detail": "Refund request failed", "error": str(exc)}, status=500)
        payment.status = PaymentModel.Status.REFUNDED
        payment.raw_response = {**(payment.raw_response or {}), "refund": res}
        payment.save(update_fields=["status", "raw_response"])
        payment.order.status = Order.Status.REFUNDED
        payment.order.save(update_fields=["status"])
        record_admin_action(
            actor=request.user,
            request=request,
            resource="payment",
            action="refund",
            object_pk=str(payment.pk),
            metadata={"amount": str(amount), "provider": payment.provider},
        )
        return Response({"ok": True, "refund": res})


class SearchSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        results = []
        if q:
            qs = (
                Product.objects.filter(is_deleted=False, active=True)
                .filter(title__icontains=q)[:5]
                .values_list("title", flat=True)
            )
            skus = Product.objects.filter(sku__icontains=q)[:5].values_list("sku", flat=True)
            results = list(qs) + list(skus)
        return Response({"suggestions": results})


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        token = signing.TimestampSigner().sign(user.email)
        return Response({"user": UserSerializer(user).data, "verify_token": token}, status=201)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        try:
            email = signing.TimestampSigner().unsign(token, max_age=60 * 60 * 24 * 7)
        except signing.BadSignature:
            return Response({"detail": "Invalid token"}, status=400)
        user = get_user_model().objects.filter(email=email).first()
        if not user:
            return Response({"detail": "User not found"}, status=404)
        if not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])
        return Response({"ok": True})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class CartMergeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Merge guest cart (from cookie/header) into user cart
        guest_key = request.COOKIES.get(CartService.COOKIE_NAME) or request.headers.get("X-Cart-Key")
        if not guest_key or guest_key.startswith("user:"):
            return Response({"merged": False})
        guest_cache_key = f"cart:{guest_key}"
        user_cache_key = CartService._key(request)
        guest_cart = cache.get(guest_cache_key) or {}
        user_cart = cache.get(user_cache_key) or {}
        merged = user_cart.copy()
        for pid, qty in guest_cart.items():
            merged[pid] = merged.get(pid, 0) + qty
        cache.set(user_cache_key, merged, timeout=60 * 60 * 24 * 7)
        cache.delete(guest_cache_key)

        guest_saved_key = f"{guest_cache_key}{SavedCartService.SUFFIX}"
        user_saved_key = SavedCartService._key(request)
        guest_saved = cache.get(guest_saved_key) or {}
        user_saved = cache.get(user_saved_key) or {}
        saved_merged = {**guest_saved, **user_saved}
        cache.set(user_saved_key, saved_merged, timeout=60 * 60 * 24 * 7)
        cache.delete(guest_saved_key)
        return Response({"merged": True, "items": merged})
