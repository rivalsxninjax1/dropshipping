"""Centralized constants for the store app.

This module groups cookie names, cache prefixes, provider keys and other
string literals that were previously scattered across views and tasks.
"""

"""Centralized constants for configuration and magic strings.

This file defines string literals and settings used across the store app to
avoid scattering them throughout the codebase and to improve maintainability.
"""

# ------------------ Cart / Caching ------------------
CART_COOKIE_NAME = "cart_key"
CART_CACHE_PREFIX = "cart:"
CART_USER_KEY_PATTERN = "cart:user:{user_id}"
CART_GUEST_KEY_PATTERN = "cart:{key}"
CART_GUEST_PREFIX = "guest:"

# TTLs
CART_TTL_SECONDS = 60 * 60 * 24 * 7        # 7 days
CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30    # 30 days

# ------------------ Providers & Status ------------------
# Providers (should match Payment.Provider choices)
PROVIDER_ESEWA = "esewa"
PROVIDER_KHALTI = "khalti"
PROVIDER_STRIPE = "stripe"
PROVIDER_PAYPAL = "paypal"
PROVIDER_OTHER = "other"

# Order statuses (should match Order.Status choices)
ORDER_PENDING = "pending"
ORDER_PAID = "paid"
ORDER_PROCESSING = "processing"
ORDER_SHIPPED = "shipped"
ORDER_DELIVERED = "delivered"
ORDER_CANCELLED = "cancelled"
ORDER_REFUNDED = "refunded"

# Payment statuses (should match Payment.Status choices)
PAYMENT_PENDING = "pending"
PAYMENT_SUCCEEDED = "succeeded"
PAYMENT_FAILED = "failed"
PAYMENT_REFUNDED = "refunded"

# ------------------ Users ------------------
# Roles (should match User.Role choices)
ROLE_CUSTOMER = "customer"
ROLE_ADMIN = "admin"
ROLE_SUPPLIER = "supplier"

# ------------------ Pagination ------------------
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100

# ------------------ Inventory ------------------
LOW_STOCK_THRESHOLD = 3
RESERVATION_TIMEOUT_SECONDS = 60 * 10  # reserved for 10 minutes (future use)

