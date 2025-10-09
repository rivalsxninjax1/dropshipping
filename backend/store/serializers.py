from typing import List

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import get_user_model
from .models import (
    Product,
    Category,
    Supplier,
    Order,
    OrderItem,
    Review,
    ReviewMedia,
    Address,
    Coupon,
    Wishlist,
    WishlistItem,
    ReturnRequest,
    Notification,
    OrderStatusEvent,
    ProductVariant,
    Bundle,
    BundleItem,
    SizeGuide,
    ContentPage,
    AdminActionLog,
)


class CategorySerializer(serializers.ModelSerializer):
    size_guide_available = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "parent",
            "hero_image",
            "tagline",
            "is_trending",
            "display_order",
            "size_guide_available",
        ]

    def get_size_guide_available(self, obj):
        return hasattr(obj, "size_guide")


class SizeGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = SizeGuide
        fields = ["headline", "content", "measurement_image", "updated_at"]


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ["id", "size", "color", "sku", "price_modifier", "stock", "position", "is_default"]


class ReviewMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewMedia
        fields = ["id", "image", "alt_text", "created_at"]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "contact_email", "active", "markup_type", "markup_value", "external_id", "last_synced_at"]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    supplier = SupplierSerializer(read_only=True)
    avg_rating = serializers.FloatField(read_only=True)
    stock_qty = serializers.IntegerField(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    size_guide = SizeGuideSerializer(source="category.size_guide", read_only=True)
    urgency_copy = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "base_price",
            "sku",
            "images",
            "video_url",
            "gallery",
            "brand",
            "category",
            "supplier",
            "avg_rating",
            "stock_qty",
            "shipping_time_min_days",
            "shipping_time_max_days",
            "attributes",
            "size_fit_notes",
            "variants",
            "size_guide",
            "urgency_copy",
            "active",
            "created_at",
            "updated_at",
        ]

    def get_urgency_copy(self, obj) -> str | None:
        qty = getattr(obj, "stock_qty", None)
        if qty is None:
            return None
        if qty <= 0:
            return "Out of stock"
        threshold = 5
        if qty <= threshold:
            return f"Only {qty} left in stock"
        if qty <= threshold * 2:
            return "Selling fast"
        return None


class ProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "base_price",
            "sku",
            "images",
            "video_url",
            "gallery",
            "brand",
            "category",
            "supplier",
            "shipping_time_min_days",
            "shipping_time_max_days",
            "attributes",
            "size_fit_notes",
            "active",
        ]


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "product", "rating", "comment", "created_at"]
        read_only_fields = ("created_at",)


class ReviewSerializer(serializers.ModelSerializer):
    media = ReviewMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = ["id", "product", "user", "rating", "comment", "verified_purchase", "created_at", "media"]
        read_only_fields = fields


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(source="product", queryset=Product.objects.all(), write_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_id", "unit_price", "quantity", "variant_info"]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "discount_type",
            "value",
            "min_order_total",
            "per_user_limit",
            "usage_limit",
            "is_active",
            "expires_at",
            "is_referral",
            "influencer_name",
            "influencer_handle",
            "referral_url",
        ]


class OrderStatusEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusEvent
        fields = ["id", "status", "note", "created_at"]


class ReturnRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnRequest
        fields = [
            "id",
            "order",
            "order_item",
            "status",
            "reason",
            "resolution",
            "attachments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("status", "created_at", "updated_at")
        extra_kwargs = {
            "order": {"write_only": True},
            "order_item": {"write_only": True, "required": False},
        }


class BundleItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = BundleItem
        fields = ["id", "product", "quantity", "position", "extended_price"]
        read_only_fields = fields


class BundleSerializer(serializers.ModelSerializer):
    items = BundleItemSerializer(many=True, read_only=True)
    final_price = serializers.SerializerMethodField()
    base_price = serializers.SerializerMethodField()

    class Meta:
        model = Bundle
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "tagline",
            "hero_image",
            "bundle_type",
            "discount_percent",
            "discount_amount",
            "starts_at",
            "ends_at",
            "countdown_ends_at",
            "active",
            "items",
            "base_price",
            "final_price",
        ]

    def get_final_price(self, obj: Bundle) -> str:
        return str(obj.final_price())

    def get_base_price(self, obj: Bundle) -> str:
        return str(obj.base_price())


class BundleItemWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    product_id = serializers.PrimaryKeyRelatedField(source="product", queryset=Product.objects.all())

    class Meta:
        model = BundleItem
        fields = ["id", "product_id", "quantity", "position"]


class BundleWriteSerializer(serializers.ModelSerializer):
    items = BundleItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Bundle
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "tagline",
            "hero_image",
            "bundle_type",
            "discount_percent",
            "discount_amount",
            "starts_at",
            "ends_at",
            "countdown_ends_at",
            "active",
            "items",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        bundle = Bundle.objects.create(**validated_data)
        self._sync_items(bundle, items_data)
        return bundle

    def update(self, instance: Bundle, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            self._sync_items(instance, items_data)
        return instance

    def _sync_items(self, bundle: Bundle, items_data: list[dict]):
        keep_ids: List[int] = []
        for payload in items_data:
            item_id = payload.pop("id", None)
            product = payload.pop("product")
            defaults = {**payload}
            if item_id:
                BundleItem.objects.filter(id=item_id, bundle=bundle).update(product=product, **defaults)
                keep_ids.append(item_id)
            else:
                created = BundleItem.objects.create(bundle=bundle, product=product, **defaults)
                keep_ids.append(created.id)
        if keep_ids:
            BundleItem.objects.filter(bundle=bundle).exclude(id__in=keep_ids).delete()
        else:
            BundleItem.objects.filter(bundle=bundle).delete()


class ContentPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentPage
        fields = ["id", "slug", "title", "body", "hero_image", "updated_at"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    coupon = CouponSerializer(read_only=True)
    referral_coupon = CouponSerializer(read_only=True)
    events = OrderStatusEventSerializer(many=True, read_only=True)
    return_requests = ReturnRequestSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "payment_status",
            "total_amount",
            "discount_amount",
            "coupon",
            "referral_coupon",
            "shipping_address",
            "billing_address",
            "shipping_method",
            "tracking_number",
            "estimated_delivery_at",
            "placed_at",
            "items",
            "events",
            "return_requests",
        ]
        read_only_fields = ("placed_at",)

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        order = Order.objects.create(**validated_data)
        for item in items_data:
            OrderItem.objects.create(order=order, **item)
        return order


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role", "is_active", "is_staff"]


class AdminUserSerializer(serializers.ModelSerializer):
    last_login = serializers.DateTimeField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "last_login",
            "date_joined",
        ]

    def update(self, instance, validated_data):
        role = validated_data.get("role", instance.role)
        instance = super().update(instance, validated_data)
        updates = []
        should_be_staff = role in (User.Role.ADMIN, User.Role.STAFF)
        if instance.is_staff != should_be_staff:
            instance.is_staff = should_be_staff
            updates.append("is_staff")
        if role != User.Role.ADMIN and instance.is_superuser:
            instance.is_superuser = False
            updates.append("is_superuser")
        if updates:
            instance.save(update_fields=updates)
        return instance


class AdminActionLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True)

    class Meta:
        model = AdminActionLog
        fields = [
            "id",
            "resource",
            "action",
            "object_pk",
            "status",
            "actor_email",
            "metadata",
            "changes",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(validators=[UniqueValidator(queryset=User.objects.all(), message="Email already registered")])
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create(is_active=True, **validated_data)
        user.set_password(password)
        user.save()
        Wishlist.objects.get_or_create(user=user)
        return user


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "label",
            "address_line1",
            "city",
            "state",
            "postal_code",
            "country",
            "phone",
            "is_default_shipping",
            "is_default_billing",
        ]


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(source="product", queryset=Product.objects.all(), write_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "product_id", "added_at"]


class WishlistSerializer(serializers.ModelSerializer):
    items = WishlistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "user", "items", "created_at", "updated_at"]
        read_only_fields = ("user", "created_at", "updated_at")


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "channel",
            "payload",
            "sent_at",
            "read_at",
            "created_at",
        ]


class LowStockProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    sku = serializers.CharField()
    quantity = serializers.IntegerField()
    safety_stock = serializers.IntegerField()


class AdminOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    events = OrderStatusEventSerializer(many=True, read_only=True)
    return_requests = ReturnRequestSerializer(many=True, read_only=True)
    coupon = CouponSerializer(read_only=True)
    referral_coupon = CouponSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "status",
            "payment_status",
            "total_amount",
            "discount_amount",
            "coupon",
            "referral_coupon",
            "shipping_address",
            "billing_address",
            "shipping_method",
            "tracking_number",
            "estimated_delivery_at",
            "placed_at",
            "items",
            "events",
            "return_requests",
        ]
        read_only_fields = (
            "user",
            "total_amount",
            "discount_amount",
            "coupon",
            "referral_coupon",
            "placed_at",
            "items",
            "events",
            "return_requests",
        )
