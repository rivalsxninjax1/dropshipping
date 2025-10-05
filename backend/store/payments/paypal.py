from __future__ import annotations

import os
from decimal import Decimal
from typing import Any, Dict, Tuple

from paypalcheckoutsdk.core import PayPalHttpClient, SandboxEnvironment, LiveEnvironment
from paypalcheckoutsdk.orders import OrdersCreateRequest, OrdersGetRequest, OrdersCaptureRequest
from paypalcheckoutsdk.notifications import VerifyWebhookSignatureRequest

from .base import PaymentGateway


class PayPalGateway(PaymentGateway):
    key = "paypal"

    def __init__(self):
        client_id = os.environ.get("PAYPAL_CLIENT_ID")
        client_secret = os.environ.get("PAYPAL_CLIENT_SECRET")
        if not (client_id and client_secret):
            raise RuntimeError("PayPal credentials not configured")
        mode = (os.environ.get("PAYPAL_MODE") or "sandbox").lower()
        if mode == "live":
            environment = LiveEnvironment(client_id=client_id, client_secret=client_secret)
        else:
            environment = SandboxEnvironment(client_id=client_id, client_secret=client_secret)
        self.client = PayPalHttpClient(environment)
        self.webhook_id = os.environ.get("PAYPAL_WEBHOOK_ID")
        self.return_url = os.environ.get("PAYPAL_RETURN_URL", "http://localhost:5173/payment/success")
        self.cancel_url = os.environ.get("PAYPAL_CANCEL_URL", "http://localhost:5173/payment/failure")
        self.currency = os.environ.get("PAYPAL_CURRENCY", "USD")

    def create_payment_intent(self, order, **kwargs) -> Dict[str, Any]:
        request = OrdersCreateRequest()
        request.prefer("return=representation")
        request.request_body(
            {
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": str(order.id),
                        "amount": {
                            "currency_code": self.currency,
                            "value": str(order.total_amount),
                        },
                    }
                ],
                "application_context": {
                    "return_url": self.return_url,
                    "cancel_url": self.cancel_url,
                },
            }
        )
        response = self.client.execute(request)
        order_id = response.result.id
        approval_url = next((link.href for link in response.result.links if link.rel == "approve"), None)
        return {
            "provider_payment_id": order_id,
            "payment_url": approval_url,
        }

    def capture(self, order_id: str):
        request = OrdersCaptureRequest(order_id)
        request.prefer("return=representation")
        return self.client.execute(request)

    def verify_webhook(self, payload: Dict[str, Any], headers: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        if not self.webhook_id:
            return False, {"status": "webhook_not_configured"}
        body = {
            "auth_algo": headers.get("PAYPAL-AUTH-ALGO"),
            "cert_url": headers.get("PAYPAL-CERT-URL"),
            "transmission_id": headers.get("PAYPAL-TRANSMISSION-ID"),
            "transmission_sig": headers.get("PAYPAL-TRANSMISSION-SIG"),
            "transmission_time": headers.get("PAYPAL-TRANSMISSION-TIME"),
            "webhook_id": self.webhook_id,
            "webhook_event": payload,
        }
        request = VerifyWebhookSignatureRequest()
        request.request_body(body)
        response = self.client.execute(request)
        ok = getattr(response.result, "verification_status", "FAILURE") == "SUCCESS"
        resource = payload.get("resource", {})
        provider_payment_id = resource.get("id") or payload.get("id")
        status = resource.get("status") or payload.get("event_type")
        return ok, {"status": status, "provider_payment_id": provider_payment_id, "raw": payload}

    def handle_refund(self, order, amount):
        raise NotImplementedError("Refund via PayPal is not yet implemented")

    def fetch_payment_status(self, provider_payment_id: str) -> Dict[str, Any]:
        request = OrdersGetRequest(provider_payment_id)
        response = self.client.execute(request)
        return {"status": response.result.status, "raw": response.result.__dict__}
