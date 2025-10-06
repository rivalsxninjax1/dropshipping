from __future__ import annotations

from rest_framework import viewsets, mixins
from rest_framework.permissions import AllowAny
from ..serializers import CategorySerializer
from ..models import Category


class CategoryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Public categories list."""

    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Category.objects.all()
        if self.request.query_params.get("trending") in ("1", "true", "True"):
            qs = qs.filter(is_trending=True).order_by("display_order", "name")
        else:
            qs = qs.order_by("display_order", "name")
        return qs
