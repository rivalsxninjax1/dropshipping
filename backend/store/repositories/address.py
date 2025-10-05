"""Address repository encapsulating CRUD operations for addresses."""
from __future__ import annotations

from django.db.models import QuerySet
from ..models import Address


class AddressRepository:
    @staticmethod
    def for_user(user) -> QuerySet[Address]:
        """Return addresses for the given user ordered by recent first."""
        return Address.objects.filter(user=user).order_by("-id")

