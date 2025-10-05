from __future__ import annotations

import json
import os
from decimal import Decimal
from typing import Any, Dict, Tuple

import stripe

from .base import PaymentGateway


class StripeGateway(PaymentGateway):
    key = "stripe"

    def __init__(self):
        secret = os.environ.get("STRIPE_SECRET_KEY")
        if not secret:
            raise RuntimeError("STRIPE_SECRET_KEY not configured")
        stripe.api_key = secret
        self.webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")

    def create_payment_intent(self, order, **kwargs) -> Dict[str, Any]:
        amount_cents = int(Decimal(order.total_amount) * 100)
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=os.environ.get("STRIPE_CURRENCY", "usd"),
            metadata={"order_id": order.id},
            receipt_email=order.user.email,
        )
        return {
            "provider_payment_id": intent.id,
            "client_secret": intent.client_secret,
            "payment_url": intent.next_action.get("redirect_to_url", {}).get("url") if intent.next_action else None,
        }

    def verify_webhook(self, payload: Dict[str, Any], headers: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        signature = headers.get("Stripe-Signature")
        if not self.webhook_secret or not signature:
            return False, {"status": "missing_signature"}
        raw_body = headers.get("X-Raw-Body") or json.dumps(payload)
        try:
            event = stripe.Webhook.construct_event(
                payload=raw_body,
                sig_header=signature,
                secret=self.webhook_secret,
            )
        except stripe.error.SignatureVerificationError:
            return False, {"status": "invalid_signature"}

        data = event["data"]["object"]
        status = data.get("status")
        provider_payment_id = data.get("id")
        ok = status in ("succeeded", "paid")
        normalized = {"status": status, "provider_payment_id": provider_payment_id, "raw": data}
        return ok, normalized

    def handle_refund(self, order, amount):
        payment = order.payments.filter(provider=self.key).order_by("-created_at").first()
        if not payment:
            raise ValueError("No payment to refund")
        stripe.Refund.create(payment_intent=payment.provider_payment_id, amount=int(Decimal(amount) * 100))
        return {"status": "refunded"}

    def fetch_payment_status(self, provider_payment_id: str) -> Dict[str, Any]:
        intent = stripe.PaymentIntent.retrieve(provider_payment_id)
        return {"status": intent.status, "raw": intent}
