from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple

from django.utils.module_loading import import_string

from store.models import Order


class PaymentGateway(ABC):
    key: str = "base"

    @abstractmethod
    def create_payment_intent(self, order: Order, **kwargs) -> Dict[str, Any]:
        """Return dict with keys like: payment_url, token, provider_payment_id."""

    @abstractmethod
    def verify_webhook(self, payload: Dict[str, Any], headers: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Return (is_valid, normalized_data). normalized_data should include status and provider_payment_id."""

    @abstractmethod
    def handle_refund(self, order: Order, amount) -> Dict[str, Any]:
        """Process refund. Return dict with status and reference."""

    # Optional but useful for reconciliation
    def fetch_payment_status(self, provider_payment_id: str) -> Dict[str, Any]:
        raise NotImplementedError


_GATEWAYS: Dict[str, str] = {
    "esewa": "store.payments.esewa.ESewaGateway",
    "khalti": "store.payments.khalti.KhaltiGateway",
    "stripe": "store.payments.stripe.StripeGateway",
    "paypal": "store.payments.paypal.PayPalGateway",
}


def get_gateway(key: str) -> PaymentGateway:
    key = (key or "").lower()
    if key not in _GATEWAYS:
        raise ValueError(f"Unknown payment provider '{key}'")
    cls = import_string(_GATEWAYS[key])
    return cls()
