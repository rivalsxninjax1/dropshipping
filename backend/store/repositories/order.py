"""Order repository encapsulating ORM access for orders."""
from __future__ import annotations

from django.db.models import QuerySet
from ..models import Order


class OrderRepository:
    """Repository for order queries."""

    @staticmethod
    def get_orders_for_user(user) -> QuerySet[Order]:
        """Return orders visible to the given user.

        Admin users see all orders; regular users only their own.
        """
        qs = Order.objects.select_related("user", "shipping_address", "billing_address").prefetch_related(
            "items__product"
        )
        if getattr(user, "is_staff", False):
            return qs
        return qs.filter(user=user)

