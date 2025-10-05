from __future__ import annotations

import csv
import io
import logging
from typing import Any, Dict, Iterable, Tuple, List

import requests

from .base import BaseSupplierAdapter, register_adapter

log = logging.getLogger(__name__)


class GenericCSVAdapter(BaseSupplierAdapter):
    """CSV-based supplier adapter with configurable field mapping.

    Supplier.api_credentials may contain:
    {
      "csv_url": "https://example.com/feed.csv",   # optional URL feed
      "csv_content": "title,sku,price...",          # optional inline content (uploaded)
      "field_map": {                                  # optional column mapping
        "id": "id",
        "title": "title",
        "sku": "sku",
        "price": "price",
        "stock": "stock",
        "category": "category",
        "images": "images"  # comma-separated URLs
      }
    }
    """

    DEFAULT_MAP = {
        "id": "id",
        "title": "title",
        "sku": "sku",
        "price": "price",
        "stock": "stock",
        "category": "category",
        "images": "images",
    }

    def _creds(self) -> Dict[str, Any]:
        return self.supplier.api_credentials or {}

    def _mapping(self) -> Dict[str, str]:
        fmap = self._creds().get("field_map") or {}
        m = self.DEFAULT_MAP.copy()
        m.update(fmap)
        return m

    def _fetch_csv_rows(self) -> List[Dict[str, str]]:
        creds = self._creds()
        content = creds.get("csv_content")
        if not content and creds.get("csv_url"):
            try:
                r = requests.get(creds["csv_url"], timeout=20)
                r.raise_for_status()
                content = r.text
            except Exception as exc:
                log.error("GenericCSVAdapter: failed fetching csv_url: %s", exc)
                content = None
        if not content:
            return []
        try:
            reader = csv.DictReader(io.StringIO(content))
            return list(reader)
        except Exception as exc:
            log.error("GenericCSVAdapter: CSV parse error: %s", exc)
            return []

    def _map_row(self, row: Dict[str, str]) -> Dict[str, Any]:
        m = self._mapping()
        images_raw = row.get(m["images"], "")
        images = [u.strip() for u in images_raw.split(",") if u.strip()] if images_raw else []
        price_val = row.get(m["price"]) or "0"
        try:
            price = float(price_val)
        except Exception:
            price = 0.0
        stock_val = row.get(m["stock"]) or "0"
        try:
            stock = int(float(stock_val))
        except Exception:
            stock = 0
        supplier_id = row.get(m["id"]) or row.get(m["sku"]) or row.get(m["title"]) or ""
        return {
            "id": str(supplier_id),
            "title": row.get(m["title"]) or row.get(m["sku"]) or supplier_id,
            "price": price,
            "stock": stock,
            "images": images,
            "sku": row.get(m["sku"]) or supplier_id,
            "category": row.get(m["category"]) or "General",
        }

    # ------------------ Adapter API ------------------
    def fetch_products(self, page: int = 1) -> Tuple[Iterable[Dict[str, Any]], bool]:
        rows = self._fetch_csv_rows()
        if not rows:
            return [], False
        mapped = [self._map_row(r) for r in rows]
        per_page = 50
        start = (page - 1) * per_page
        end = start + per_page
        chunk = mapped[start:end]
        has_next = end < len(mapped)
        return chunk, has_next

    def fetch_product_details(self, supplier_product_id: str) -> Dict[str, Any]:
        rows = self._fetch_csv_rows()
        m = self._mapping()
        for r in rows:
            sid = r.get(m["id"]) or r.get(m["sku"]) or r.get(m["title"]) or ""
            if str(sid) == str(supplier_product_id):
                return {**self._map_row(r), "raw": r}
        return {"id": supplier_product_id}

    def place_order(self, supplier_order_payload: Dict[str, Any]) -> Dict[str, Any]:
        # CSV suppliers typically require manual fulfillment; return stub ID.
        return {"supplier_order_id": f"csv_{supplier_order_payload.get('idempotency_key','tmp')}"}

    def get_order_status(self, supplier_order_id: str) -> Dict[str, Any]:
        # No API; assume processing.
        return {"status": "processing", "raw": {}}


register_adapter("generic", GenericCSVAdapter)

