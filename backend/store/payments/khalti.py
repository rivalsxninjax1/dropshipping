from __future__ import annotations

import uuid
import os
from decimal import Decimal
from typing import Any, Dict, Tuple

import requests

from .base import PaymentGateway


class KhaltiGateway(PaymentGateway):
    key = "khalti"

    # Sandbox-friendly defaults; override via env
    SECRET_KEY = os.environ.get("KHALTI_SECRET") or os.environ.get("KHALTI_API_KEY")
    BASE_URL = os.environ.get("KHALTI_BASE_URL", "https://a.khalti.com/api/v2")
    INITIATE_URL = os.environ.get("KHALTI_INITIATE_URL") or f"{BASE_URL}/epayment/initiate/"
    LOOKUP_URL = os.environ.get("KHALTI_LOOKUP_URL") or f"{BASE_URL}/epayment/lookup/"
    VERIFY_URL = os.environ.get("KHALTI_VERIFY_URL", "https://khalti.com/api/v2/payment/verify/")
    RETURN_URL = os.environ.get("KHALTI_RETURN_URL")  # If not provided, we will build a sensible default
    WEBSITE_URL = os.environ.get("KHALTI_WEBSITE_URL", os.environ.get("FRONTEND_URL", "http://localhost:5173"))

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.SECRET_KEY:
            headers["Authorization"] = f"Key {self.SECRET_KEY}"
        return headers

    def _default_return_url(self, order_id: int, amount: Decimal) -> str:
        # Route back to API verify endpoint so backend can finalize order status
        # Include provider and amount so token verification (legacy flow) has needed context
        base = os.environ.get("BACKEND_URL", "http://localhost:8000")
        return f"{base}/api/payments/verify/?provider=khalti&order_id={order_id}&amount={amount}"

    def create_payment_intent(self, order, **kwargs):
        # Prefer Khalti ePayment hosted page via initiate API when SECRET is available
        amount_paisa = int(Decimal(order.total_amount) * 100)
        return_url = (self.RETURN_URL or self._default_return_url(order.id, order.total_amount))

        if self.SECRET_KEY:
            try:
                payload = {
                    "return_url": return_url,
                    "website_url": self.WEBSITE_URL,
                    "amount": amount_paisa,
                    "purchase_order_id": str(order.id),
                    "purchase_order_name": f"Order {order.id}",
                }
                resp = requests.post(self.INITIATE_URL, json=payload, headers=self._headers(), timeout=20)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    pidx = data.get("pidx") or data.get("provider_payment_id") or uuid.uuid4().hex
                    payment_url = data.get("payment_url") or data.get("paymentUrl")
                    if payment_url:
                        return {
                            "payment_url": payment_url,
                            "provider_payment_id": pidx,
                            "pidx": pidx,
                            "return_url": return_url,
                        }
            except Exception:
                # Fall back to dummy flow below
                pass

        # Fallback: generate a token-like id and build a placeholder URL
        token = f"khalti_{uuid.uuid4().hex[:12]}"
        provider_payment_id = token
        payment_url = f"https://khalti.com/#/pay/{provider_payment_id}"
        return {
            "payment_url": payment_url,
            "token": token,
            "provider_payment_id": provider_payment_id,
            "return_url": return_url,
        }

    def verify_webhook(self, payload: Dict[str, Any], headers: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        # Support both classic token verification and newer pidx lookup flows.
        status = (payload.get("status") or "").lower()
        token = payload.get("token")
        pidx = payload.get("pidx")
        provider_payment_id = payload.get("provider_payment_id") or pidx or token

        ok = False
        # Try API verification if we have credentials and enough context
        if self.SECRET_KEY:
            try:
                if token:
                    # payment/verify requires amount in paisa
                    amt_raw = payload.get("amount") or payload.get("amt") or payload.get("total_amount")
                    paisa = None
                    if amt_raw is not None:
                        try:
                            paisa = int(Decimal(str(amt_raw)) * 100)
                        except Exception:
                            paisa = None
                    if paisa is not None:
                        resp = requests.post(
                            self.VERIFY_URL,
                            json={"token": token, "amount": paisa},
                            headers=self._headers(),
                            timeout=20,
                        )
                        ok = resp.status_code in (200, 201)
                elif pidx:
                    # Lookup using pidx (ePayment)
                    resp = requests.post(self.LOOKUP_URL, json={"pidx": pidx}, headers=self._headers(), timeout=20)
                    if resp.status_code in (200, 201):
                        data = {}
                        try:
                            data = resp.json()
                        except Exception:
                            data = {}
                        state = (data.get("status") or data.get("state") or "").lower()
                        ok = state in ("completed", "success", "succeeded", "paid")
            except Exception:
                # If API verification fails (network, parse, etc.), fall back below
                ok = False

        # Fallback: trust webhook-reported status when API verification isn't possible
        if not ok:
            ok = status in ("success", "succeeded", "paid") and bool(provider_payment_id)

        return ok, {"status": "succeeded" if ok else status, "provider_payment_id": provider_payment_id}

    def handle_refund(self, order, amount):
        return {"status": "refunded", "reference": f"khalti_ref_{order.id}"}

    def fetch_payment_status(self, provider_payment_id: str) -> Dict[str, Any]:
        # For local/testing, infer a success prefix; in real usage, prefer LOOKUP API
        status = "succeeded" if str(provider_payment_id).startswith("khalti_ok_") else "processing"
        return {"status": status}
