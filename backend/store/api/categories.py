from __future__ import annotations

from rest_framework import viewsets, mixins
from rest_framework.permissions import AllowAny
from ..serializers import CategorySerializer
from ..models import Category


class CategoryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Public categories list."""

    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

