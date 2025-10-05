from __future__ import annotations

import abc
from typing import Any, Dict, Iterable, Tuple

from store.models import Supplier


class BaseSupplierAdapter(abc.ABC):
    """Abstract base class for supplier adapters.

    Implement concrete adapters that translate supplier APIs into a uniform interface.
    """

    def __init__(self, supplier: Supplier):
        self.supplier = supplier

    # Product listing: returns iterable of supplier product dicts + pagination flag
    @abc.abstractmethod
    def fetch_products(self, page: int = 1) -> Tuple[Iterable[Dict[str, Any]], bool]:
        """Return (products, has_next) for given page.
        Each product dict should include keys: id, title, price, stock, images, sku, category.
        """

    @abc.abstractmethod
    def fetch_product_details(self, supplier_product_id: str) -> Dict[str, Any]:
        """Return details for a specific supplier product id."""

    @abc.abstractmethod
    def place_order(self, supplier_order_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Place an order at the supplier; return dict with 'supplier_order_id' and any metadata."""

    @abc.abstractmethod
    def get_order_status(self, supplier_order_id: str) -> Dict[str, Any]:
        """Return order status and tracking info for supplier order id."""


# Adapter registry
_ADAPTERS = {}


def register_adapter(key: str, cls):
    _ADAPTERS[key.lower()] = cls


def get_adapter_for_supplier(supplier: Supplier) -> BaseSupplierAdapter:
    key = supplier.name.lower().strip()
    cls = _ADAPTERS.get(key)
    if not cls:
        # default fallback: try known prefixes inside name
        if "aliexpress" in key:
            from .aliexpress import AliExpressAdapter

            cls = AliExpressAdapter
        elif key in ("cj", "cj dropshipping", "cjdropshipping"):
            from .cj import CJAdapter

            cls = CJAdapter
        else:
            raise ValueError(f"No adapter registered for supplier '{supplier.name}'")
    return cls(supplier)

