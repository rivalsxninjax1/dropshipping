from decimal import Decimal

from django.db.models import Count
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from store.models import Coupon, CouponRedemption
from store.serializers import CouponSerializer


class CouponViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_field = "code"
    serializer_class = CouponSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminUser()]
        if self.action == "validate":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Coupon.objects.all()
        if self.action in ("list", "retrieve", "validate") and not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        return qs

    @action(detail=False, methods=["post"], url_path="validate", permission_classes=[AllowAny])
    def validate(self, request):
        code = (request.data.get("code") or "").strip()
        order_total = Decimal(str(request.data.get("order_total") or "0"))
        coupon = Coupon.objects.filter(code__iexact=code, is_active=True).first()
        if not coupon:
            return Response({"valid": False, "detail": "Coupon not found"}, status=status.HTTP_404_NOT_FOUND)
        if coupon.expires_at and timezone.now() > coupon.expires_at:
            return Response({"valid": False, "detail": "Coupon expired"}, status=status.HTTP_400_BAD_REQUEST)
        if coupon.min_order_total and order_total < coupon.min_order_total:
            return Response({"valid": False, "detail": "Order total too low"}, status=status.HTTP_400_BAD_REQUEST)
        if coupon.usage_limit:
            used = coupon.redemptions.count()
            if used >= coupon.usage_limit:
                return Response({"valid": False, "detail": "Coupon usage limit reached"}, status=status.HTTP_400_BAD_REQUEST)
        if coupon.per_user_limit and request.user.is_authenticated:
            per_user_used = coupon.redemptions.filter(user=request.user).count()
            if per_user_used >= coupon.per_user_limit:
                return Response({"valid": False, "detail": "Coupon already used"}, status=status.HTTP_400_BAD_REQUEST)

        discount_amount = coupon.value
        if coupon.discount_type == Coupon.DiscountType.PERCENT:
            discount_amount = (order_total * coupon.value / Decimal("100"))
        discount_amount = discount_amount.quantize(Decimal("0.01"))
        return Response({
            "valid": True,
            "coupon": CouponSerializer(coupon).data,
            "discount_amount": str(discount_amount),
        })
