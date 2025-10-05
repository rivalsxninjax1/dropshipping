from __future__ import annotations

"""Product-related API views (thin layer).

These views delegate heavy lifting to repositories/services for clarity.
"""

from rest_framework import viewsets, mixins
from rest_framework.permissions import AllowAny, IsAdminUser
from ..serializers import ProductSerializer, ProductWriteSerializer
from ..filters import ProductFilter
from ..repositories.product import ProductRepository
from ..repositories.product import Product
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
import csv
import io
from decimal import Decimal
from django.utils.text import slugify
from ..models import Category
from ..models import Supplier
from ..tasks import sync_supplier_products


class ProductViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Public product listing and retrieval.

    Supports filtering, search and ordering via DRF and django-filter.
    """

    lookup_field = "slug"
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    filterset_class = ProductFilter
    search_fields = ["title", "sku"]
    ordering_fields = ["base_price", "created_at", "avg_rating", "title"]

    def get_queryset(self):
        return ProductRepository.get_active_products_queryset().order_by("-created_at")


class AdminProductViewSet(viewsets.ModelViewSet):
    """Admin product management with CSV bulk import.

    Uses write serializer for create/update and read serializer otherwise.
    """

    permission_classes = [IsAdminUser]
    queryset = Product.objects.all().select_related("category", "supplier")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        return ProductSerializer

    @action(detail=False, methods=["post"], url_path="bulk-import")
    def bulk_import(self, request):
        csv_text = request.data.get("csv")
        if not csv_text and "file" in request.FILES:
            csv_text = request.FILES["file"].read().decode("utf-8")
        if not csv_text:
            return Response({"detail": "CSV content required"}, status=400)

        reader = csv.DictReader(io.StringIO(csv_text))
        created = 0
        for row in reader:
            title = row.get("title")
            sku = row.get("sku")
            price = Decimal(row.get("price", "0"))
            cat_name = row.get("category", "General")
            category, _ = Category.objects.get_or_create(name=cat_name, defaults={"slug": slugify(cat_name)})
            obj, was_created = Product.objects.get_or_create(
                sku=sku,
                defaults={
                    "title": title or sku,
                    "slug": slugify(title or sku),
                    "base_price": price,
                    "category": category,
                },
            )
            created += 1 if was_created else 0
        return Response({"created": created})

    @action(detail=False, methods=["post"], url_path="upload-csv")
    def upload_csv_for_supplier(self, request):
        """Upload a CSV file for a specific supplier and trigger sync.

        Body params:
          - supplier_id: int (required)
          - file: CSV file OR 'csv' text in request.data
          - field_map: JSON mapping of columns (optional)
        """
        supplier_id = request.data.get("supplier_id")
        if not supplier_id:
            return Response({"detail": "supplier_id is required"}, status=400)
        try:
            supplier = Supplier.objects.get(id=int(supplier_id))
        except Exception:
            return Response({"detail": "Supplier not found"}, status=404)

        csv_text = request.data.get("csv")
        if not csv_text and "file" in request.FILES:
            csv_text = request.FILES["file"].read().decode("utf-8")
        if not csv_text:
            return Response({"detail": "CSV content required"}, status=400)

        creds = supplier.api_credentials or {}
        creds["csv_content"] = csv_text
        # Optional field map
        field_map = request.data.get("field_map")
        if field_map:
            # Accept dict or JSON string
            if isinstance(field_map, str):
                import json

                try:
                    field_map = json.loads(field_map)
                except Exception:
                    field_map = None
            if isinstance(field_map, dict):
                creds["field_map"] = field_map
        supplier.api_credentials = creds
        supplier.save(update_fields=["api_credentials"])

        # Trigger sync using the generic adapter through the existing task
        sync_supplier_products.delay(supplier.id)
        return Response({"ok": True, "message": "CSV uploaded and sync triggered"})


class SearchSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        results: list[str] = []
        if q:
            results = ProductRepository.search_titles_and_skus(q, limit=5)
        return Response({"suggestions": results})
