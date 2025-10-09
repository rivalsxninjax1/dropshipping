from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import F, Q, Sum
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
    User,
    AdminActionLog,
)
from store.permissions import IsAdmin, IsStaff
from store.serializers import (
    SupplierSerializer,
    AdminOrderSerializer,
    CouponSerializer,
    LowStockProductSerializer,
    CategorySerializer,
    BundleSerializer,
    BundleWriteSerializer,
    ContentPageSerializer,
    AdminUserSerializer,
    AdminActionLogSerializer,
)
from store.tasks import sync_supplier_products
from store.payments.base import get_gateway
from .mixins import AuditedModelViewSet


class AdminMetricsView(APIView):
    permission_classes = [IsAuthenticated, IsStaff]

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
    permission_classes = [IsAuthenticated, IsStaff]
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


class AdminSupplierViewSet(AuditedModelViewSet):
    queryset = Supplier.objects.all().order_by('name')
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    @action(detail=True, methods=['post'], url_path='sync')
    def sync(self, request, pk=None):
        supplier = self.get_object()
        sync_supplier_products.delay(supplier.id)
        supplier.last_synced_at = timezone.now()
        supplier.save(update_fields=['last_synced_at'])
        self.log_admin_action(
            action='sync',
            instance=supplier,
            metadata={'supplier_id': supplier.id, 'last_synced_at': supplier.last_synced_at.isoformat() if supplier.last_synced_at else None},
        )
        return Response({'ok': True, 'supplier_id': supplier.id, 'last_synced_at': supplier.last_synced_at})


class AdminOrderViewSet(AuditedModelViewSet):
    queryset = Order.objects.all().select_related('user').prefetch_related('items__product', 'events', 'return_requests')
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAuthenticated, IsStaff]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        status_filter = params.get('status')
        payment_filter = params.get('payment_status')
        user_filter = params.get('user')
        search = params.get('q') or params.get('search')
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if payment_filter:
            qs = qs.filter(payment_status=payment_filter)
        if user_filter:
            qs = qs.filter(user_id=user_filter)
        if start_date:
            qs = qs.filter(placed_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(placed_at__date__lte=end_date)
        if search:
            qs = qs.filter(
                Q(id__icontains=search)
                | Q(user__email__icontains=search)
                | Q(tracking_number__icontains=search)
            )
        return qs.order_by('-placed_at')

    def perform_update(self, serializer):
        previous = self.get_object()
        old_status = previous.status
        old_payment = previous.payment_status
        super().perform_update(serializer)
        order = serializer.instance
        note = 'Updated by admin'
        if 'status' in serializer.validated_data and order.status != old_status:
            OrderStatusEvent.objects.create(order=order, status=order.status, note=note)
        if 'payment_status' in serializer.validated_data and order.payment_status != old_payment:
            OrderStatusEvent.objects.create(order=order, status=order.status, note=f'Payment: {order.payment_status}')

    @action(detail=True, methods=['post'], url_path='refund')
    def refund(self, request, pk=None):
        order = self.get_object()
        amount = Decimal(str(request.data.get('amount') or order.total_amount))
        payment = order.payments.filter(status=PaymentModel.Status.SUCCEEDED).order_by('-created_at').first()
        if not payment:
            self.log_admin_action(action='refund', instance=order, status='failure', metadata={'reason': 'no_successful_payment'})
            return Response({'detail': 'No successful payment to refund.'}, status=status.HTTP_400_BAD_REQUEST)
        gateway = get_gateway(payment.provider)
        try:
            gateway.handle_refund(order, amount)
        except NotImplementedError:
            self.log_admin_action(action='refund', instance=order, status='failure', metadata={'reason': 'gateway_not_supported'})
            return Response({'detail': 'Refund not supported for this provider.'}, status=status.HTTP_400_BAD_REQUEST)
        payment.status = PaymentModel.Status.REFUNDED
        payment.save(update_fields=['status'])
        order.status = Order.Status.REFUNDED
        order.payment_status = Order.PaymentStatus.REFUNDED
        order.save(update_fields=['status', 'payment_status'])
        OrderStatusEvent.objects.create(order=order, status=order.status, note='Refund processed')
        self.log_admin_action(
            action='refund',
            instance=order,
            metadata={'amount': str(amount), 'payment_id': payment.id},
        )
        return Response(self.get_serializer(order).data)


class AdminCouponViewSet(AuditedModelViewSet):
    queryset = Coupon.objects.all().order_by('-expires_at')
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated, IsStaff]


class AdminCategoryViewSet(AuditedModelViewSet):
    queryset = Category.objects.all().order_by('display_order', 'name')
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsStaff]


class AdminBundleViewSet(AuditedModelViewSet):
    queryset = Bundle.objects.all().prefetch_related('items__product')
    permission_classes = [IsAuthenticated, IsStaff]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return BundleWriteSerializer
        return BundleSerializer


class AdminContentPageViewSet(AuditedModelViewSet):
    queryset = ContentPage.objects.all().order_by('slug')
    serializer_class = ContentPageSerializer
    permission_classes = [IsAuthenticated, IsStaff]


class AdminUserViewSet(AuditedModelViewSet):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    audit_resource = 'user'

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        role = params.get('role')
        status_filter = params.get('status')
        search = params.get('q') or params.get('search')
        if role:
            qs = qs.filter(role=role)
        if status_filter == 'active':
            qs = qs.filter(is_active=True)
        elif status_filter == 'inactive':
            qs = qs.filter(is_active=False)
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        return qs.order_by('-date_joined')


class AdminActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AdminActionLog.objects.select_related('actor').order_by('-created_at')
    serializer_class = AdminActionLogSerializer
    permission_classes = [IsAuthenticated, IsStaff]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        resource = params.get('resource')
        actor = params.get('actor')
        status_filter = params.get('status')
        if resource:
            qs = qs.filter(resource=resource)
        if actor:
            qs = qs.filter(actor__email__icontains=actor)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs
