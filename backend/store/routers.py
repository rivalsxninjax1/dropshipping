from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api import (
    ProductViewSet,
    CategoryViewSet,
    OrdersViewSet,
    AddressesViewSet,
    ReviewsViewSet,
    BundleViewSet,
    ContentPageViewSet,
    AdminProductViewSet,
    AdminSupplierViewSet,
    AdminOrderViewSet,
    AdminCouponViewSet,
    AdminCategoryViewSet,
    AdminBundleViewSet,
    AdminContentPageViewSet,
    AdminMetricsView,
    AdminLowStockView,
    WishlistViewSet,
    CouponViewSet,
    NotificationViewSet,
    ReturnRequestViewSet,
    CartView,
    CartSaveForLaterView,
    CartClearView,
    CheckoutView,
    OrderTrackingView,
    PaymentsWebhookView,
    PaymentsVerifyView,
    PaymentRefundView,
    SearchSuggestionsView,
    HealthView,
    RegisterView,
    VerifyEmailView,
    MeView,
    CartMergeView,
)


router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"orders", OrdersViewSet, basename="order")
router.register(r"addresses", AddressesViewSet, basename="address")
router.register(r"reviews", ReviewsViewSet, basename="review")
router.register(r"bundles", BundleViewSet, basename="bundle")
router.register(r"pages", ContentPageViewSet, basename="content-page")
router.register(r"wishlist", WishlistViewSet, basename="wishlist")
router.register(r"coupons", CouponViewSet, basename="coupon")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"returns", ReturnRequestViewSet, basename="return-request")

admin_router = DefaultRouter()
admin_router.register(r"products", AdminProductViewSet, basename="admin-products")
admin_router.register(r"suppliers", AdminSupplierViewSet, basename="admin-suppliers")
admin_router.register(r"orders", AdminOrderViewSet, basename="admin-orders")
admin_router.register(r"coupons", AdminCouponViewSet, basename="admin-coupons")
admin_router.register(r"categories", AdminCategoryViewSet, basename="admin-categories")
admin_router.register(r"bundles", AdminBundleViewSet, basename="admin-bundles")
admin_router.register(r"pages", AdminContentPageViewSet, basename="admin-pages")


api_urlpatterns = [
    path("", include(router.urls)),
    path("admin/", include(admin_router.urls)),
    path("admin/metrics/", AdminMetricsView.as_view(), name="admin-metrics"),
    path("admin/low-stock/", AdminLowStockView.as_view(), name="admin-low-stock"),
    path("admin/payments/<int:pk>/refund/", PaymentRefundView.as_view(), name="payment-refund"),
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/save-for-later/", CartSaveForLaterView.as_view(), name="cart-save-for-later"),
    path("cart/clear/", CartClearView.as_view(), name="cart-clear"),
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("order-tracking/", OrderTrackingView.as_view(), name="order-track"),
    path("payments/webhook/", PaymentsWebhookView.as_view(), name="payments-webhook"),
    path("payments/verify/", PaymentsVerifyView.as_view(), name="payments-verify"),
    path("search/suggestions/", SearchSuggestionsView.as_view(), name="search-suggestions"),
    path("health/", HealthView.as_view(), name="health"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/verify/", VerifyEmailView.as_view(), name="auth-verify"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("cart/merge/", CartMergeView.as_view(), name="cart-merge"),
]
