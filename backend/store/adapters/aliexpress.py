from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, Tuple

import requests

from .base import BaseSupplierAdapter, register_adapter

log = logging.getLogger(__name__)


class AliExpressAdapter(BaseSupplierAdapter):
    """AliExpress adapter.

    If an official API is available for your account, configure API base URL and credentials
    where indicated below. Otherwise, you would implement a resilient scraper module here
    that respects robots.txt and legal constraints. The scraping logic would live in helper
    methods that fetch and parse product listing pages and detail pages. For production use,
    add randomized delays, proxy rotation, and robust error handling.
    """

    API_BASE = "https://api.aliexpress.example/v1"  # Placeholder
    API_KEY = None  # Set via self.supplier.api_credentials or environment

    def _headers(self) -> Dict[str, str]:
        api_key = None
        if self.supplier.api_credentials:
            api_key = self.supplier.api_credentials.get("api_key")
        api_key = api_key or self.API_KEY or "demo-key"
        return {"Authorization": f"Bearer {api_key}"}

    def fetch_products(self, page: int = 1) -> Tuple[Iterable[Dict[str, Any]], bool]:
        # Example using API; replace URL with real endpoint or call scraper
        try:
            resp = requests.get(
                f"{self.API_BASE}/products",
                params={"page": page, "page_size": 50},
                headers=self._headers(),
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.warning("AliExpress API failed, falling back to stub: %s", exc)
            data = {"items": [], "has_next": False}

        products = []
        for item in data.get("items", []):
            mapped = {
                "id": str(item.get("id")),
                "title": item.get("title") or item.get("name"),
                "price": item.get("price") or item.get("min_price"),
                "stock": item.get("stock", 0),
                "images": item.get("images", []),
                "sku": item.get("sku") or item.get("item_sku"),
                "category": item.get("category_name") or item.get("category"),
            }
            products.append(mapped)
        return products, bool(data.get("has_next"))

    def fetch_product_details(self, supplier_product_id: str) -> Dict[str, Any]:
        try:
            resp = requests.get(
                f"{self.API_BASE}/products/{supplier_product_id}", headers=self._headers(), timeout=15
            )
            resp.raise_for_status()
            item = resp.json()
        except Exception as exc:
            log.error("AliExpress details fetch failed: %s", exc)
            item = {"id": supplier_product_id}
        return {
            "id": str(item.get("id", supplier_product_id)),
            "title": item.get("title") or item.get("name", "Unknown"),
            "price": item.get("price", 0),
            "stock": item.get("stock", 0),
            "images": item.get("images", []),
            "sku": item.get("sku") or item.get("item_sku", str(supplier_product_id)),
            "category": item.get("category_name") or item.get("category"),
            "raw": item,
        }

    def place_order(self, supplier_order_payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            resp = requests.post(
                f"{self.API_BASE}/orders",
                json=supplier_order_payload,
                headers=self._headers(),
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.error("AliExpress place_order failed: %s", exc)
            data = {"order_id": f"ali_{supplier_order_payload.get('idempotency_key','tmp')}"}
        return {"supplier_order_id": str(data.get("order_id"))}

    def get_order_status(self, supplier_order_id: str) -> Dict[str, Any]:
        try:
            resp = requests.get(
                f"{self.API_BASE}/orders/{supplier_order_id}", headers=self._headers(), timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            data = {"status": "processing"}
        return {
            "status": data.get("status", "processing"),
            "tracking_number": (data.get("tracking") or {}).get("number"),
            "raw": data,
        }


register_adapter("aliexpress", AliExpressAdapter)

