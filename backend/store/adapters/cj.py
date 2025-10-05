from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, Tuple

import requests

from .base import BaseSupplierAdapter, register_adapter

log = logging.getLogger(__name__)


class CJAdapter(BaseSupplierAdapter):
    """CJ Dropshipping adapter.

    Uses CJ API patterns. Configure API base and keys in supplier.api_credentials like:
    {"api_key": "<CJ_API_KEY>", "base_url": "https://developers.cjdropshipping.com/api"}
    """

    def _base(self) -> str:
        if self.supplier.api_credentials and self.supplier.api_credentials.get("base_url"):
            return self.supplier.api_credentials["base_url"].rstrip("/")
        return "https://api.cj.example"  # placeholder

    def _headers(self) -> Dict[str, str]:
        api_key = (self.supplier.api_credentials or {}).get("api_key", "demo-key")
        return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    def fetch_products(self, page: int = 1) -> Tuple[Iterable[Dict[str, Any]], bool]:
        try:
            resp = requests.get(f"{self._base()}/products", params={"page": page, "per_page": 50}, headers=self._headers(), timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.warning("CJ products fetch failed: %s", exc)
            data = {"list": [], "has_next": False}
        out = []
        for p in data.get("list", []):
            out.append({
                "id": str(p.get("id")),
                "title": p.get("title") or p.get("name"),
                "price": p.get("price") or p.get("salePrice"),
                "stock": p.get("stock", 0),
                "images": p.get("images", []),
                "sku": p.get("sku") or p.get("productSku"),
                "category": p.get("categoryName") or p.get("category"),
            })
        return out, bool(data.get("has_next"))

    def fetch_product_details(self, supplier_product_id: str) -> Dict[str, Any]:
        try:
            resp = requests.get(f"{self._base()}/products/{supplier_product_id}", headers=self._headers(), timeout=15)
            resp.raise_for_status()
            p = resp.json()
        except Exception as exc:
            log.error("CJ details failed: %s", exc)
            p = {"id": supplier_product_id}
        return {
            "id": str(p.get("id", supplier_product_id)),
            "title": p.get("title") or p.get("name", "Unknown"),
            "price": p.get("price", 0),
            "stock": p.get("stock", 0),
            "images": p.get("images", []),
            "sku": p.get("sku") or str(supplier_product_id),
            "category": p.get("categoryName") or p.get("category"),
            "raw": p,
        }

    def place_order(self, supplier_order_payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            resp = requests.post(f"{self._base()}/orders", json=supplier_order_payload, headers=self._headers(), timeout=20)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.error("CJ place_order failed: %s", exc)
            data = {"order_id": f"cj_{supplier_order_payload.get('idempotency_key','tmp')}"}
        return {"supplier_order_id": str(data.get("order_id"))}

    def get_order_status(self, supplier_order_id: str) -> Dict[str, Any]:
        try:
            resp = requests.get(f"{self._base()}/orders/{supplier_order_id}", headers=self._headers(), timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            data = {"status": "processing"}
        return {"status": data.get("status", "processing"), "tracking_number": (data.get("tracking") or {}).get("number"), "raw": data}


register_adapter("cj", CJAdapter)
register_adapter("cj dropshipping", CJAdapter)

