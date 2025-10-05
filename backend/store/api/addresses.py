from __future__ import annotations

from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from ..serializers import AddressSerializer
from ..repositories.address import AddressRepository


class AddressesViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """User addresses CRUD endpoints (auth required)."""

    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return AddressRepository.for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

