"""Repository package exports.

Each repository encapsulates ORM access for a specific aggregate.
"""

from .product import ProductRepository  # noqa: F401
from .order import OrderRepository  # noqa: F401
from .address import AddressRepository  # noqa: F401

