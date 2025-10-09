from __future__ import annotations

"""Product-related API views (thin layer).

These views delegate heavy lifting to repositories/services for clarity.
"""

import csv
import io
from decimal import Decimal

from django.utils.text import slugify
from django.db.models import Count, Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .mixins import AuditedModelViewSet
from ..filters import ProductFilter
from ..models import Category, Supplier, User
from ..permissions import IsStaffOrVendor
from ..repositories.product import Product, ProductRepository
from ..serializers import ProductSerializer, ProductWriteSerializer
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

    @action(detail=True, methods=["get"], permission_classes=[AllowAny], url_path="recommendations")
    def recommendations(self, request, slug=None):
        product = self.get_object()
        base_qs = ProductRepository.get_active_products_queryset()
        related = (
            base_qs.filter(order_items__order__items__product=product)
            .exclude(id=product.id)
            .annotate(freq=Count("order_items__id"))
            .order_by("-freq", "-avg_rating")
        )
        if not related.exists():
            related = base_qs.filter(category=product.category).exclude(id=product.id).order_by("-avg_rating", "-created_at")
        serializer = self.get_serializer(related[:8], many=True)
        return Response(serializer.data)


class AdminProductViewSet(AuditedModelViewSet):
    """Admin product management with CSV bulk import.

    Uses write serializer for create/update and read serializer otherwise.
    """

    permission_classes = [IsAuthenticated, IsStaffOrVendor]
    queryset = Product.objects.all().select_related("category", "supplier")

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        params = getattr(self.request, "query_params", {})
        if getattr(user, "role", None) == User.Role.VENDOR:
            supplier = self._resolve_supplier_for_vendor(user)
            if not supplier:
                return qs.none()
            qs = qs.filter(supplier=supplier)
        search = params.get("q") or params.get("search")
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(sku__icontains=search))
        supplier_filter = params.get("supplier") or params.get("supplier_id")
        if supplier_filter:
            qs = qs.filter(supplier_id=supplier_filter)
        active_param = params.get("active")
        if active_param is not None:
            active_value = str(active_param).lower()
            if active_value in {"true", "1", "yes"}:
                qs = qs.filter(active=True)
            elif active_value in {"false", "0", "no"}:
                qs = qs.filter(active=False)
        return qs.order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        return ProductSerializer

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        if getattr(user, "role", None) == User.Role.VENDOR:
            supplier = self._ensure_vendor_supplier(user)
            serializer.validated_data["supplier"] = supplier
        super().perform_create(serializer)

    def perform_update(self, serializer):
        user = getattr(self.request, "user", None)
        if getattr(user, "role", None) == User.Role.VENDOR:
            supplier = self._ensure_vendor_supplier(user)
            serializer.validated_data["supplier"] = supplier
        super().perform_update(serializer)

    @action(detail=False, methods=["post"], url_path="bulk-import")
    def bulk_import(self, request):
        if getattr(request.user, "role", None) == User.Role.VENDOR:
            self.log_admin_action(
                action="bulk_import",
                status="failure",
                metadata={"reason": "vendor_not_allowed"},
            )
            return Response({"detail": "Bulk import is restricted to staff accounts."}, status=403)
        csv_text = request.data.get("csv")
        if not csv_text and "file" in request.FILES:
            csv_text = request.FILES["file"].read().decode("utf-8")
        if not csv_text:
            self.log_admin_action(action="bulk_import", status="failure", metadata={"reason": "missing_csv"})
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
        self.log_admin_action(action="bulk_import", metadata={"created": created})
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
            self.log_admin_action(action="upload_csv", status="failure", metadata={"reason": "missing_supplier"})
            return Response({"detail": "supplier_id is required"}, status=400)
        try:
            supplier = Supplier.objects.get(id=int(supplier_id))
        except Exception:
            self.log_admin_action(action="upload_csv", status="failure", metadata={"reason": "supplier_not_found", "supplier_id": supplier_id})
            return Response({"detail": "Supplier not found"}, status=404)

        user = getattr(request, "user", None)
        if getattr(user, "role", None) == User.Role.VENDOR:
            vendor_supplier = self._ensure_vendor_supplier(user)
            if vendor_supplier.id != supplier.id:
                self.log_admin_action(
                    action="upload_csv",
                    status="failure",
                    metadata={"reason": "supplier_mismatch", "supplier_id": supplier.id},
                )
                raise PermissionDenied("You can only upload feeds for your supplier account.")

        csv_text = request.data.get("csv")
        if not csv_text and "file" in request.FILES:
            csv_text = request.FILES["file"].read().decode("utf-8")
        if not csv_text:
            self.log_admin_action(action="upload_csv", status="failure", metadata={"reason": "missing_csv", "supplier_id": supplier.id})
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
        self.log_admin_action(
            action="upload_csv",
            metadata={"supplier_id": supplier.id, "has_field_map": bool(creds.get("field_map"))},
        )
        return Response({"ok": True, "message": "CSV uploaded and sync triggered"})

    def _ensure_vendor_supplier(self, user):
        supplier = self._resolve_supplier_for_vendor(user)
        if not supplier:
            self.log_admin_action(action="vendor_scope_violation", status="failure", metadata={"reason": "supplier_missing"})
            raise PermissionDenied("Your account is not linked to a supplier.")
        return supplier

    @staticmethod
    def _resolve_supplier_for_vendor(user):
        if not getattr(user, "email", None):
            return None
        return Supplier.objects.filter(contact_email__iexact=user.email).first()


class SearchSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        results: list[str] = []
        if q:
            results = ProductRepository.search_titles_and_skus(q, limit=5)
        return Response({"suggestions": results})
