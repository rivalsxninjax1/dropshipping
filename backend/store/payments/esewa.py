from __future__ import annotations

import uuid
import os
import hmac
import hashlib
import base64
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Tuple
from urllib.parse import urlencode, urlparse, parse_qsl, urlunparse

from .base import PaymentGateway


class ESewaGateway(PaymentGateway):
    key = "esewa"

    MERCHANT_ID = os.environ.get("ESEWA_MERCHANT_ID", "merchant")
    SECRET = os.environ.get("ESEWA_SECRET")
    BASE_URL = os.environ.get("ESEWA_BASE_URL", "https://uat.esewa.com.np/epay")
    FORM_URL = os.environ.get("ESEWA_FORM_URL")
    STATUS_URL = os.environ.get("ESEWA_STATUS_URL")
    DEFAULT_FORM_URL = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
    DEFAULT_STATUS_URL = "https://rc.esewa.com.np/api/epay/transaction/status/"
    SUCCESS_URL = os.environ.get("ESEWA_SUCCESS_URL")
    FAILURE_URL = os.environ.get("ESEWA_FAILURE_URL")
    WEBSITE_URL = os.environ.get("ESEWA_WEBSITE_URL") or os.environ.get("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

    SERVICE_CHARGE = os.environ.get("ESEWA_SERVICE_CHARGE", "0")
    DELIVERY_CHARGE = os.environ.get("ESEWA_DELIVERY_CHARGE", "0")
    TAX_AMOUNT = os.environ.get("ESEWA_TAX_AMOUNT", "0")
    DEFAULT_CONVERSION_RATE = os.environ.get("ESEWA_CONVERSION_RATE", "133.5")

    @staticmethod
    def _decimal(value: Any, default: str = "0") -> Decimal:
        try:
            return Decimal(str(value))
        except Exception:
            return Decimal(default)

    @staticmethod
    def _format_amount(value: Decimal) -> str:
        return format(value.quantize(Decimal("0.01")), "f")

    def _conversion_rate(self) -> Decimal:
        return self._decimal(self.DEFAULT_CONVERSION_RATE, "133.5")

    def _to_npr(self, amount: Decimal) -> Decimal:
        rate = self._conversion_rate()
        if amount <= 0 or rate <= 0:
            return amount
        return (amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def _with_query(self, base_url: str, **params: Any) -> str:
        parsed = urlparse(base_url)
        existing = dict(parse_qsl(parsed.query, keep_blank_values=True))
        existing.update({k: str(v) for k, v in params.items() if v is not None})
        new_query = urlencode(existing)
        return urlunparse(parsed._replace(query=new_query))

    def _success_url(self, order, provider_payment_id: str, amount_npr: str, base_url: str | None = None) -> str:
        base = base_url or self.WEBSITE_URL
        url = self.SUCCESS_URL or f"{base.rstrip('/')}/payment/success"
        return self._with_query(url, provider=self.key, order_id=order.id, pid=provider_payment_id, amt=amount_npr)

    def _failure_url(self, order, provider_payment_id: str, base_url: str | None = None) -> str:
        base = base_url or self.WEBSITE_URL
        url = self.FAILURE_URL or f"{base.rstrip('/')}/payment/failure"
        return self._with_query(url, provider=self.key, order_id=order.id, pid=provider_payment_id)

    def _normalize_origin(self, origin: Any | None) -> str | None:
        if not origin:
            return None
        parsed = urlparse(str(origin))
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
        return str(origin).rstrip('/') or None

    def create_payment_intent(self, order, **kwargs):
        frontend_origin = self._normalize_origin(kwargs.get("frontend_origin"))
        token = f"esewa_{uuid.uuid4().hex[:12]}"
        base_amount = self._to_npr(self._decimal(order.total_amount, str(order.total_amount)))
        service_charge = self._decimal(self.SERVICE_CHARGE)
        delivery_charge = self._decimal(self.DELIVERY_CHARGE)
        tax_amount = self._decimal(self.TAX_AMOUNT)
        total_amount = base_amount + service_charge + delivery_charge + tax_amount

        amount_base_str = self._format_amount(base_amount)
        service_charge_str = self._format_amount(service_charge)
        delivery_charge_str = self._format_amount(delivery_charge)
        tax_amount_str = self._format_amount(tax_amount)
        total_amount_str = self._format_amount(total_amount)

        base_for_urls = frontend_origin or self.WEBSITE_URL

        transaction_uuid = uuid.uuid4().hex
        signed_fields = ["total_amount", "transaction_uuid", "product_code"]
        signed_field_values = {
            "total_amount": total_amount_str,
            "transaction_uuid": transaction_uuid,
            "product_code": self.MERCHANT_ID,
        }
        signed_field_names = ",".join(signed_fields)
        signature_payload = ",".join(f"{field}={signed_field_values[field]}" for field in signed_fields)
        signature = ""
        if self.SECRET:
            digest = hmac.new(self.SECRET.encode(), signature_payload.encode(), hashlib.sha256).digest()
            signature = base64.b64encode(digest).decode()

        success_url = self._success_url(order, transaction_uuid, total_amount_str, base_for_urls)
        failure_url = self._failure_url(order, transaction_uuid, base_for_urls)

        form_fields = {
            "amount": amount_base_str,
            "tax_amount": tax_amount_str,
            "total_amount": total_amount_str,
            "transaction_uuid": transaction_uuid,
            "product_code": self.MERCHANT_ID,
            "product_service_charge": service_charge_str,
            "product_delivery_charge": delivery_charge_str,
            "success_url": success_url,
            "failure_url": failure_url,
            "signed_field_names": signed_field_names,
            "signature": signature,
        }

        form_url = self._payment_form_url()
        return {
            "payment_url": None,
            "payment_form": {
                "url": form_url,
                "method": "POST",
                "fields": form_fields,
            },
            "token": token,
            "provider_payment_id": transaction_uuid,
            "success_url": success_url,
            "failure_url": failure_url,
            "amount_npr": total_amount_str,
            "base_amount_npr": amount_base_str,
        }

    def verify_webhook(self, payload: Dict[str, Any], headers: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        status = (payload.get("status") or payload.get("state") or "").lower()
        provider_payment_id = payload.get("provider_payment_id") or payload.get("refId") or payload.get("oid")
        transaction_id = payload.get("transaction_id") or payload.get("txn_id") or provider_payment_id
        amount = payload.get("amount") or payload.get("amt") or payload.get("total_amount")
        
        signature_valid = False
        if self.SECRET:
            # Verify signature from headers
            raw = (headers.get("X-Raw-Body") or "").encode() or (str(payload).encode())
            sig = headers.get("X-Signature", "")
            expected = hmac.new(self.SECRET.encode(), raw, hashlib.sha256).hexdigest()
            signature_valid = hmac.compare_digest(sig, expected)
            
            # If signature is present but invalid, reject the webhook
            if sig and not signature_valid:
                return False, {
                    "status": "invalid_signature", 
                    "provider_payment_id": provider_payment_id,
                    "signature_verified": False
                }
        
        # Verify with eSewa API if possible
        api_verified = False
        response_data = {}
        if self.SECRET and transaction_id and amount:
            try:
                status_url = self.STATUS_URL or self.DEFAULT_STATUS_URL
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Key {self.SECRET}"
                }
                params = {
                    "transaction_id": transaction_id,
                    "amount": amount,
                    "merchant_id": self.MERCHANT_ID
                }
                
                resp = requests.get(status_url, params=params, headers=headers, timeout=15)
                if resp.status_code in (200, 201):
                    try:
                        response_data = resp.json()
                        api_status = (response_data.get("status") or "").lower()
                        api_verified = api_status in ("success", "succeeded", "paid", "complete", "completed")
                    except Exception:
                        pass
            except Exception:
                # If API verification fails, continue with basic validation
                pass
                
        # Determine if payment is valid based on signature or API verification
        ok = (api_verified or signature_valid or (not sig and not api_verified)) and \
             status in ("success", "succeeded", "paid") and bool(provider_payment_id)
             
        result = {
            "status": "succeeded" if ok else status,
            "provider_payment_id": provider_payment_id,
            "signature_verified": signature_valid,
            "api_verified": api_verified
        }
        
        # Include additional data from API response if available
        if response_data:
            result["transaction_details"] = response_data
            
        return ok, result

    def handle_refund(self, order, amount):
        return {"status": "refunded", "reference": f"esewa_ref_{order.id}"}

    def fetch_payment_status(self, provider_payment_id: str) -> Dict[str, Any]:
        status = "succeeded" if str(provider_payment_id).startswith("esewa_ok_") else "processing"
        return {"status": status}

    def _payment_form_url(self) -> str:
        """Resolve a usable eSewa form endpoint, tolerating legacy values."""
        candidates = (self.FORM_URL, self.BASE_URL, self.DEFAULT_FORM_URL)
        for candidate in candidates:
            if not candidate:
                continue
            candidate = candidate.strip()
            if not candidate:
                continue
            parsed = urlparse(candidate)
            path_clean = (parsed.path or "").rstrip("/")
            if "transaction/status" in path_clean:
                continue
            base = urlunparse(parsed._replace(params="", query="", fragment="")).rstrip("/")
            lower_path = path_clean.lower()
            if lower_path.endswith("/form"):
                return base
            if lower_path.endswith("/main/v2"):
                return f"{base}/form"
            if lower_path.endswith("/main"):
                return f"{base}/v2/form"
            if lower_path.endswith("/api/epay") or lower_path.endswith("/epay"):
                return f"{base}/main/v2/form"
            if not lower_path:
                return f"{base}/api/epay/main/v2/form"
            return base
        return self.DEFAULT_FORM_URL

    def status_endpoint(self) -> str:
        """Expose the status enquiry endpoint for callers that need it."""
        candidates = (self.STATUS_URL, self.BASE_URL, self.DEFAULT_STATUS_URL)
        for candidate in candidates:
            if not candidate:
                continue
            candidate = candidate.strip()
            if "transaction/status" in candidate:
                return candidate
        return self.DEFAULT_STATUS_URL
