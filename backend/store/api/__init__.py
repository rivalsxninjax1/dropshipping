"""API layer exports.

Thin DRF views that delegate to services/repositories. For endpoints not yet
refactored, we re-export from the legacy views module to preserve behavior.
"""

from .products import ProductViewSet, AdminProductViewSet, SearchSuggestionsView  # noqa: F401
from .categories import CategoryViewSet  # noqa: F401
from .addresses import AddressesViewSet  # noqa: F401
from .wishlist import WishlistViewSet  # noqa: F401
from .coupons import CouponViewSet  # noqa: F401
from .notifications import NotificationViewSet  # noqa: F401
from .returns import ReturnRequestViewSet  # noqa: F401
from .admin import (  # noqa: F401
    AdminMetricsView,
    AdminLowStockView,
    AdminSupplierViewSet,
    AdminOrderViewSet,
    AdminCouponViewSet,
)

# Re-export legacy views until they are refactored
from ..views import (  # noqa: F401
    OrdersViewSet,
    ReviewsViewSet,
    SupplierViewSet,
    CartView,
    CartClearView,
    CheckoutView,
    PaymentsWebhookView,
    PaymentsVerifyView,
    PaymentRefundView,
    HealthView,
    RegisterView,
    VerifyEmailView,
    MeView,
    CartMergeView,
)
