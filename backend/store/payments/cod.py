from __future__ import annotations

from typing import Any, Dict, Tuple

from store.models import Order

from .base import PaymentGateway


class CODGateway(PaymentGateway):
    key = "cod"

    def create_payment_intent(self, order: Order, **kwargs) -> Dict[str, Any]:
        return {
            "status": "pending",
            "provider_payment_id": f"cod_{order.id}",
            "instructions": "Pay with cash when your order arrives at your doorstep.",
        }

    def verify_webhook(self, payload: Dict[str, Any], headers: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        # Cash on delivery does not rely on remote webhooks. Manual confirmation required.
        return True, {"status": payload.get("status", "pending"), "provider_payment_id": payload.get("provider_payment_id")}

    def handle_refund(self, order: Order, amount) -> Dict[str, Any]:
        # COD refunds are handled offline; return placeholder reference.
        return {"status": "pending", "reference": f"cod-refund-{order.id}"}

    def fetch_payment_status(self, provider_payment_id: str) -> Dict[str, Any]:
        return {"status": "pending", "provider_payment_id": provider_payment_id}
