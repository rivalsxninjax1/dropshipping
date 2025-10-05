from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, Tuple, Optional

import requests

from .base import BaseSupplierAdapter, register_adapter

log = logging.getLogger(__name__)


class PrintfulAdapter(BaseSupplierAdapter):
    """Printful supplier adapter with OAuth2 support.

    Expected supplier.api_credentials JSON structure:
    {
      "client_id": "<OAUTH_CLIENT_ID>",
      "client_secret": "<OAUTH_CLIENT_SECRET>",
      "base_url": "https://api.printful.com",        # optional, defaults provided
      "token_url": "https://oauth.printful.com/token", # optional
      "access_token": "<initial_or_refreshed_access>",
      "refresh_token": "<refresh_token>",
      "expires_in": 3600,                               # optional, informational
      "token_type": "Bearer"                            # optional
    }

    Notes:
      - If an API request returns 401 and a refresh_token is present, the adapter
        will attempt to refresh the token and retry once, persisting the new
        token back to Supplier.api_credentials.
      - Product details will include variant mapping under 'variant_info'.
      - Uploading a print file is supported via upload_print_file().
    """

    # ------------------ OAuth helpers ------------------
    def _creds(self) -> Dict[str, Any]:
        return self.supplier.api_credentials or {}

    def _base(self) -> str:
        return (self._creds().get("base_url") or "https://api.printful.com").rstrip("/")

    def _token_url(self) -> str:
        return (self._creds().get("token_url") or "https://oauth.printful.com/token").rstrip("/")

    def _headers(self) -> Dict[str, str]:
        access = self._creds().get("access_token")
        headers = {
            "Accept": "application/json",
        }
        if access:
            headers["Authorization"] = f"Bearer {access}"
        return headers

    def _save_tokens(self, data: Dict[str, Any]):
        c = self._creds().copy()
        for k in ("access_token", "refresh_token", "expires_in", "token_type"):
            if k in data:
                c[k] = data[k]
        self.supplier.api_credentials = c
        try:
            self.supplier.save(update_fields=["api_credentials"])
        except Exception as exc:
            log.warning("Failed saving refreshed tokens: %s", exc)

    def _refresh_and_retry(self, method: str, url: str, **kwargs):
        """Try to refresh token and retry once."""
        creds = self._creds()
        refresh = creds.get("refresh_token")
        client_id = creds.get("client_id")
        client_secret = creds.get("client_secret")
        if not (refresh and client_id and client_secret):
            return None
        try:
            resp = requests.post(
                self._token_url(),
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                timeout=15,
            )
            resp.raise_for_status()
            token_data = resp.json()
            self._save_tokens(token_data)
        except Exception as exc:
            log.error("Printful token refresh failed: %s", exc)
            return None
        # Retry once with new headers
        try:
            headers = kwargs.pop("headers", {}) or {}
            headers.update(self._headers())
            r2 = requests.request(method, url, headers=headers, timeout=kwargs.pop("timeout", 15), **kwargs)
            r2.raise_for_status()
            return r2
        except Exception as exc:
            log.error("Printful request retry failed: %s", exc)
            return None

    def _request(self, method: str, path: str, **kwargs) -> Optional[requests.Response]:
        url = f"{self._base()}{path}"
        headers = kwargs.pop("headers", {}) or {}
        headers.update(self._headers())
        try:
            resp = requests.request(method, url, headers=headers, timeout=kwargs.pop("timeout", 15), **kwargs)
            if resp.status_code == 401:
                # attempt refresh
                retried = self._refresh_and_retry(method, url, headers=headers, **kwargs)
                return retried
            resp.raise_for_status()
            return resp
        except Exception as exc:
            log.error("Printful request failed: %s %s -> %s", method, url, exc)
            return None

    # ------------------ Adapter API ------------------
    def fetch_products(self, page: int = 1) -> Tuple[Iterable[Dict[str, Any]], bool]:
        resp = self._request("GET", "/products", params={"page": page, "per_page": 50})
        if not resp:
            return [], False
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        # Printful often wraps data under 'result'
        items = data.get("result") or data.get("list") or []
        out = []
        for p in items:
            out.append(
                {
                    "id": str(p.get("id")),
                    "title": p.get("name") or p.get("title"),
                    "price": p.get("retail_price") or p.get("price"),
                    "stock": p.get("in_stock", 0),
                    "images": p.get("images", []),
                    "sku": p.get("sku") or p.get("external_id"),
                    "category": p.get("category") or p.get("product_type"),
                }
            )
        has_next = bool(data.get("paging", {}).get("next")) or bool(data.get("has_next"))
        return out, has_next

    def fetch_product_details(self, supplier_product_id: str) -> Dict[str, Any]:
        resp = self._request("GET", f"/products/{supplier_product_id}")
        if not resp:
            return {"id": supplier_product_id}
        data = resp.json()
        # Result may contain { product: {...}, variants: [...] }
        result = data.get("result") or data
        prod = result.get("product") or result
        variants = result.get("variants") or []
        variant_info = {
            "variants": [
                {
                    "id": v.get("id"),
                    "sku": v.get("sku") or v.get("external_id"),
                    "name": v.get("name") or v.get("size"),
                    "retail_price": v.get("retail_price") or v.get("price"),
                    "in_stock": v.get("in_stock", True),
                    "color": v.get("color"),
                    "size": v.get("size"),
                }
                for v in variants
            ]
        }
        return {
            "id": str(prod.get("id", supplier_product_id)),
            "title": prod.get("name") or prod.get("title", "Unknown"),
            "price": prod.get("retail_price") or prod.get("price", 0),
            "stock": prod.get("in_stock", 0),
            "images": prod.get("images", []),
            "sku": prod.get("sku") or str(supplier_product_id),
            "category": prod.get("category") or prod.get("product_type"),
            "variant_info": variant_info,
            "raw": result,
        }

    def place_order(self, supplier_order_payload: Dict[str, Any]) -> Dict[str, Any]:
        # Expect payload to already match Printful order schema.
        resp = self._request("POST", "/orders", json=supplier_order_payload)
        if not resp:
            return {"supplier_order_id": f"printful_{supplier_order_payload.get('idempotency_key','tmp')}"}
        data = resp.json()
        result = data.get("result") or data
        order_id = result.get("id") or result.get("order_id")
        return {"supplier_order_id": str(order_id)}

    def get_order_status(self, supplier_order_id: str) -> Dict[str, Any]:
        resp = self._request("GET", f"/orders/{supplier_order_id}")
        if not resp:
            return {"status": "processing"}
        data = resp.json()
        result = data.get("result") or data
        status = result.get("status", "processing")
        tracking = None
        shipments = result.get("shipments") or []
        if shipments:
            t = shipments[0]
            tracking = t.get("tracking_number") or (t.get("tracking") or {}).get("number")
        return {"status": status, "tracking_number": tracking, "raw": result}

    # ------------------ Extra helpers ------------------
    def upload_print_file(self, file_bytes: bytes, filename: str, purpose: str = "preview") -> Dict[str, Any]:
        """Upload a print file to Printful.

        Args:
            file_bytes: Binary file content.
            filename: File name, e.g., 'design.png'.
            purpose: Optional purpose flag for Printful (default 'preview').

        Returns:
            Dict with file information returned by the API, or an error description.
        """
        url = f"{self._base()}/files"
        headers = self._headers()
        # requests with files should not send JSON content-type
        headers.pop("Content-Type", None)
        try:
            resp = requests.post(url, headers=headers, files={"file": (filename, file_bytes)}, data={"purpose": purpose}, timeout=30)
            if resp.status_code == 401:
                retried = self._refresh_and_retry("POST", url, files={"file": (filename, file_bytes)}, data={"purpose": purpose})
                if retried is None:
                    return {"error": "unauthorized"}
                resp = retried
            resp.raise_for_status()
            data = resp.json()
            return data.get("result") or data
        except Exception as exc:
            log.error("Printful file upload failed: %s", exc)
            return {"error": str(exc)}


register_adapter("printful", PrintfulAdapter)

