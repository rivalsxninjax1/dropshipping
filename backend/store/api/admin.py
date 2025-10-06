from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum, F
from django.db.models.functions import TruncDay
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from store.models import (
    Inventory,
    Supplier,
    Order,
    Payment as PaymentModel,
    Notification,
    Coupon,
    OrderStatusEvent,
    Category,
    Bundle,
    ContentPage,
)
from store.permissions import IsStaffUser
from store.serializers import (
    SupplierSerializer,
    AdminOrderSerializer,
    CouponSerializer,
    LowStockProductSerializer,
    CategorySerializer,
    BundleSerializer,
    BundleWriteSerializer,
    ContentPageSerializer,
)
from store.tasks import sync_supplier_products
from store.payments.base import get_gateway


class AdminMetricsView(APIView):
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get(self, request):
        now = timezone.now()
        start_week = now - timedelta(days=6)
        start_month = now - timedelta(days=30)

        revenue_agg = PaymentModel.objects.filter(status=PaymentModel.Status.SUCCEEDED).aggregate(total=Sum('amount'))
        revenue = revenue_agg.get('total') or Decimal('0.00')

        orders_last_week = Order.objects.filter(placed_at__date__gte=start_week.date()).count()
        payments_last_week = PaymentModel.objects.filter(status=PaymentModel.Status.SUCCEEDED, created_at__date__gte=start_week.date())

        weekly_sales = payments_last_week.annotate(day=TruncDay('created_at')).values('day').annotate(total=Sum('amount')).order_by('day')
        weekly = [
            {
                'label': entry['day'].strftime('%b %d'),
                'value': float(entry['total'] or 0),
            }
            for entry in weekly_sales
        ]

        by_payment = payments_last_week.values('provider').annotate(amount=Sum('amount')).order_by('-amount')
        payment_mix = [
            {
                'provider': (entry.get('provider') or 'other').title(),
                'amount': float(entry['amount'] or 0),
            }
            for entry in by_payment
        ]

        abandoned = Notification.objects.filter(
            notification_type=Notification.Type.ABANDONED_CART,
            created_at__gte=start_week,
        ).count()
        conversion_base = orders_last_week + abandoned
        conversion_rate = round((orders_last_week / conversion_base * 100) if conversion_base else 0, 2)

        data = {
            'revenue': float(revenue),
            'orders': orders_last_week,
            'conversionRate': conversion_rate,
            'abandonedCarts': abandoned,
            'weekly': weekly,
            'byPayment': payment_mix,
        }
        return Response(data)


class AdminLowStockView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsStaffUser]
    serializer_class = LowStockProductSerializer

    def get_queryset(self):
        threshold = int(self.request.query_params.get('threshold') or 5)
        qs = (
            Inventory.objects.select_related('product')
            .filter(quantity__lte=F('safety_stock') + threshold)
            .order_by('quantity')
        )
        return qs

    def list(self, request, *args, **kwargs):
        results = [
            {
                'id': inv.product.id,
                'title': inv.product.title,
                'sku': inv.product.sku,
                'quantity': inv.quantity,
                'safety_stock': inv.safety_stock,
            }
            for inv in self.get_queryset()
        ]
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)


class AdminSupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by('name')
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated, IsStaffUser]

    @action(detail=True, methods=['post'], url_path='sync')
    def sync(self, request, pk=None):
        supplier = self.get_object()
        sync_supplier_products.delay(supplier.id)
        supplier.last_synced_at = timezone.now()
        supplier.save(update_fields=['last_synced_at'])
        return Response({'ok': True, 'supplier_id': supplier.id, 'last_synced_at': supplier.last_synced_at})


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related('user').prefetch_related('items__product', 'events', 'return_requests')
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAuthenticated, IsStaffUser]

    def perform_update(self, serializer):
        previous = self.get_object()
        old_status = previous.status
        old_payment = previous.payment_status
        order = serializer.save()
        note = 'Updated by admin'
        if 'status' in serializer.validated_data and order.status != old_status:
            OrderStatusEvent.objects.create(order=order, status=order.status, note=note)
        if 'payment_status' in serializer.validated_data and order.payment_status != old_payment:
            OrderStatusEvent.objects.create(order=order, status=order.status, note=f'Payment: {order.payment_status}')
        return order

    @action(detail=True, methods=['post'], url_path='refund')
    def refund(self, request, pk=None):
        order = self.get_object()
        amount = Decimal(str(request.data.get('amount') or order.total_amount))
        payment = order.payments.filter(status=PaymentModel.Status.SUCCEEDED).order_by('-created_at').first()
        if not payment:
            return Response({'detail': 'No successful payment to refund.'}, status=status.HTTP_400_BAD_REQUEST)
        gateway = get_gateway(payment.provider)
        try:
            gateway.handle_refund(order, amount)
        except NotImplementedError:
            return Response({'detail': 'Refund not supported for this provider.'}, status=status.HTTP_400_BAD_REQUEST)
        payment.status = PaymentModel.Status.REFUNDED
        payment.save(update_fields=['status'])
        order.status = Order.Status.REFUNDED
        order.payment_status = Order.PaymentStatus.REFUNDED
        order.save(update_fields=['status', 'payment_status'])
        OrderStatusEvent.objects.create(order=order, status=order.status, note='Refund processed')
        return Response(self.get_serializer(order).data)


class AdminCouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all().order_by('-expires_at')
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated, IsStaffUser]


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('display_order', 'name')
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsStaffUser]


class AdminBundleViewSet(viewsets.ModelViewSet):
    queryset = Bundle.objects.all().prefetch_related('items__product')
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return BundleWriteSerializer
        return BundleSerializer


class AdminContentPageViewSet(viewsets.ModelViewSet):
    queryset = ContentPage.objects.all().order_by('slug')
    serializer_class = ContentPageSerializer
    permission_classes = [IsAuthenticated, IsStaffUser]
