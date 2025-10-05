from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404

from store.models import ReturnRequest, OrderItem, Order
from store.serializers import ReturnRequestSerializer


class ReturnRequestViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ReturnRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ReturnRequest.objects.select_related("order", "order_item")
        if not self.request.user.is_staff:
            qs = qs.filter(order__user=self.request.user)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        order = get_object_or_404(Order, id=self.request.data.get("order"), user=self.request.user)
        order_item_id = self.request.data.get("order_item")
        order_item = None
        if order_item_id:
            order_item = get_object_or_404(OrderItem, id=order_item_id, order=order)
        serializer.save(order=order, order_item=order_item)

    def update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def set_status(self, request, pk=None):
        obj = self.get_object()
        status_value = request.data.get("status")
        if status_value not in dict(ReturnRequest.Status.choices):
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = status_value
        obj.resolution = request.data.get("resolution", obj.resolution)
        obj.save(update_fields=["status", "resolution", "updated_at"])
        return Response(ReturnRequestSerializer(obj).data)
