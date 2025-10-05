"""Product repository encapsulating ORM queries.

This layer provides reusable query helpers for products and keeps raw ORM access
out of views and services.
"""
from __future__ import annotations

from django.db.models import Avg, F, IntegerField, QuerySet
from django.db.models.functions import Coalesce
from ..models import Product


class ProductRepository:
    """Repository for product queries and updates."""

    @staticmethod
    def get_active_products_queryset() -> QuerySet[Product]:
        """Return active, non-deleted products annotated with rating and stock.

        Returns:
            QuerySet[Product]: Optimized queryset with related category/supplier
            and annotations: avg_rating and stock_qty.
        """
        return (
            Product.objects.filter(is_deleted=False, active=True)
            .select_related("category", "supplier")
            .annotate(
                avg_rating=Avg("reviews__rating"),
                stock_qty=Coalesce(F("inventory__quantity"), 0, output_field=IntegerField()),
            )
        )

    @staticmethod
    def get_by_slug(slug: str) -> Product:
        """Fetch a single product by slug.

        Args:
            slug: Product slug.

        Returns:
            Product
        """
        return Product.objects.select_related("category", "supplier").get(slug=slug)

    @staticmethod
    def search_titles_and_skus(query: str, limit: int = 10) -> list[str]:
        """Return a list of suggestions by title and SKU.

        Args:
            query: Search string.
            limit: Max suggestions per field.

        Returns:
            List of strings combining titles and SKUs.
        """
        titles = list(
            Product.objects.filter(is_deleted=False, active=True, title__icontains=query)
            .values_list("title", flat=True)[:limit]
        )
        skus = list(
            Product.objects.filter(is_deleted=False, active=True, sku__icontains=query)
            .values_list("sku", flat=True)[:limit]
        )
        return titles + skus

