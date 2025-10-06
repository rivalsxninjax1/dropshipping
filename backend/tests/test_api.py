import io
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from store.models import (
    Review,
    Order,
    Coupon,
    Payment,
    Bundle,
    BundleItem,
    ContentPage,
    OrderItem,
    OrderStatusEvent,
)
from .factories import (
    create_user,
    create_category,
    create_supplier,
    create_product,
    ensure_inventory,
    ensure_address,
)


@pytest.mark.django_db
def test_products_list_and_filtering():
    client = APIClient()
    cat1 = create_category("Phones")
    cat2 = create_category("Laptops")
    sup = create_supplier("BrandCo")
    p1 = create_product("Alpha Phone", "SKU-001", cat1, sup, price=Decimal("199.99"))
    p2 = create_product("Beta Laptop", "SKU-002", cat2, sup, price=Decimal("999.99"))
    ensure_inventory(p1, 5)
    ensure_inventory(p2, 0)

    # Add a review to p1 to enable rating filter
    user = create_user("rater@example.com")
    Review.objects.create(user=user, product=p1, rating=5, comment="Great!")

    # List
    resp = client.get("/api/products/?page_size=50")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2

    # Filter by category slug
    resp = client.get(f"/api/products/?category={cat1.slug}&page_size=50")
    assert resp.status_code == 200
    assert resp.json()["count"] == 1

    # Price range
    resp = client.get("/api/products/?price_min=500&page_size=50")
    assert resp.json()["count"] == 1

    # Rating and stock
    resp = client.get("/api/products/?rating_min=4&stock=true&page_size=50")
    assert resp.json()["count"] == 1

    # Search
    resp = client.get("/api/products/?search=Alpha&page_size=50")
    assert resp.json()["count"] == 1


@pytest.mark.django_db
def test_cart_operations_guest():
    client = APIClient()
    cat = create_category("Gadgets")
    sup = create_supplier("GadgetCo")
    p = create_product("Widget", "SKU-010", cat, sup, price=Decimal("10.00"))

    # Add to cart
    resp = client.post("/api/cart/", {"product_id": p.id, "quantity": 2}, format="json")
    assert resp.status_code == 200
    assert resp.cookies.get("cart_key") is not None
    assert resp.json()["items"][0]["quantity"] == 2

    # Update quantity
    resp = client.patch("/api/cart/", {"product_id": p.id, "quantity": 5}, format="json")
    assert resp.status_code == 200
    assert resp.json()["items"][0]["quantity"] == 5

    # Remove item
    resp = client.delete("/api/cart/", {"product_id": p.id}, format="json")
    assert resp.status_code == 200
    assert resp.json()["items"] == []


@pytest.mark.django_db
def test_checkout_and_webhook_success(monkeypatch):
    client = APIClient()
    user = create_user("buyer@example.com")
    client.force_authenticate(user)
    addr = ensure_address(user)

    cat = create_category("Books")
    sup = create_supplier("PubCo")
    prod = create_product("Novel", "SKU-BOOK-1", cat, sup, price=Decimal("15.00"))
    ensure_inventory(prod, 10)

    # Add to cart (authenticated)
    resp = client.post("/api/cart/", {"product_id": prod.id, "quantity": 3}, format="json")
    assert resp.status_code == 200

    # Checkout with eSewa
    resp = client.post(
        "/api/checkout/",
        {"shipping_address": addr.id, "billing_address": addr.id, "provider": "esewa"},
        format="json",
    )
    assert resp.status_code == 201
    order_id = resp.json()["order_id"]
    assert order_id is not None
    assert resp.json()["payment_intent"]["provider"] in ("esewa", "khalti")

    # Webhook success
    class DummyResp:
        status_code = 200
        text = "Success"

    monkeypatch.setattr("store.views.requests.get", lambda *args, **kwargs: DummyResp())

    hook = client.get(
        "/api/payments/verify/",
        {
            "provider": "esewa",
            "order_id": order_id,
            "provider_payment_id": "esewa_ok_1",
            "refId": "esewa_ok_ref",
        },
    )
    assert hook.status_code == 200
    assert hook.json()["ok"] is True
    assert Order.objects.get(id=order_id).status == Order.Status.PAID


@pytest.mark.django_db
def test_checkout_cod_with_referral_discount():
    client = APIClient()
    user = create_user("cod@example.com")
    client.force_authenticate(user)
    addr = ensure_address(user)

    category = create_category("Streetwear")
    supplier = create_supplier("Street Co")
    product = create_product("Hoodie", "COD-001", category, supplier, price=Decimal("80.00"))
    ensure_inventory(product, 5)

    coupon = Coupon.objects.create(
        code="GURU10",
        discount_type=Coupon.DiscountType.PERCENT,
        value=Decimal("10.00"),
        is_referral=True,
        influencer_name="Guru",
        is_active=True,
    )

    client.post("/api/cart/", {"product_id": product.id, "quantity": 1}, format="json")
    resp = client.post(
        "/api/checkout/",
        {
            "shipping_address": addr.id,
            "billing_address": addr.id,
            "provider": "cod",
            "referral_code": "GURU10",
        },
        format="json",
    )

    assert resp.status_code == 201
    payload = resp.json()
    assert payload["payment_intent"]["provider"] == "cod"
    order = Order.objects.get(id=payload["order_id"])
    assert order.referral_coupon == coupon
    assert order.discount_amount > Decimal("0.00")
    payment = Payment.objects.filter(order=order).first()
    assert payment is not None
    assert payment.provider == Payment.Provider.COD
    assert payment.status == Payment.Status.PENDING


@pytest.mark.django_db
def test_order_tracking_endpoint_returns_timeline():
    client = APIClient()
    user = create_user("track@example.com")
    addr = ensure_address(user)
    category = create_category("Shoes")
    supplier = create_supplier("Sneaker Hub")
    product = create_product("Sneaker", "TRK-001", category, supplier, price=Decimal("120.00"))
    ensure_inventory(product, 2)

    order = Order.objects.create(
        user=user,
        status=Order.Status.SHIPPED,
        payment_status=Order.PaymentStatus.PAID,
        total_amount=Decimal("120.00"),
        shipping_address=addr,
        billing_address=addr,
    )
    OrderItem.objects.create(order=order, product=product, unit_price=Decimal("120.00"), quantity=1)
    OrderStatusEvent.objects.create(order=order, status=Order.Status.SHIPPED, note="On the way")

    resp = client.post("/api/order-tracking/", {"order_id": order.id, "email": user.email}, format="json")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["id"] == order.id
    assert payload["events"]

    missing = client.post("/api/order-tracking/", {"order_id": order.id, "email": "wrong@example.com"}, format="json")
    assert missing.status_code == 404


@pytest.mark.django_db
def test_bundle_list_and_detail():
    client = APIClient()
    category = create_category("Bundles")
    supplier = create_supplier("Bundle Co")
    prod = create_product("Bundle Item", "B-001", category, supplier, price=Decimal("55.00"))
    ensure_inventory(prod, 10)
    bundle = Bundle.objects.create(title="Creator Combo", slug="creator-combo", bundle_type="top_picks", discount_percent=Decimal("5.0"), active=True)
    BundleItem.objects.create(bundle=bundle, product=prod, quantity=1, position=1)

    resp = client.get("/api/bundles/?page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1

    detail = client.get("/api/bundles/creator-combo/")
    assert detail.status_code == 200
    assert detail.json()["slug"] == "creator-combo"


@pytest.mark.django_db
def test_cart_save_for_later_flow():
    client = APIClient()
    user = create_user("saved@example.com")
    client.force_authenticate(user)
    category = create_category("Accessories")
    supplier = create_supplier("Acc Co")
    product = create_product("Cap", "ACC-1", category, supplier, price=Decimal("18.00"))
    ensure_inventory(product, 5)

    client.post("/api/cart/", {"product_id": product.id, "quantity": 1}, format="json")
    resp = client.post("/api/cart/save-for-later/", {"product_id": product.id}, format="json")
    assert resp.status_code == 201
    assert len(resp.json()["items"]) == 1

    resp = client.get("/api/cart/save-for-later/")
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 1


@pytest.mark.django_db
def test_reviews_accept_photo_upload():
    client = APIClient()
    user = create_user("reviewer@example.com")
    client.force_authenticate(user)
    category = create_category("Beauty")
    supplier = create_supplier("Glow Co")
    product = create_product("Serum", "SRM-1", category, supplier, price=Decimal("45.00"))
    ensure_inventory(product, 1)

    order = Order.objects.create(
        user=user,
        status=Order.Status.PAID,
        payment_status=Order.PaymentStatus.PAID,
        total_amount=Decimal("45.00"),
        shipping_address=ensure_address(user),
        billing_address=ensure_address(user),
    )
    OrderItem.objects.create(order=order, product=product, unit_price=Decimal("45.00"), quantity=1)

    image = SimpleUploadedFile("review.jpg", b"fakeimg", content_type="image/jpeg")
    resp = client.post(
        "/api/reviews/",
        {"product": product.id, "rating": 5, "comment": "Loved it", "images": image},
        format="multipart",
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["verified_purchase"] is True
    assert data["media"]


@pytest.mark.django_db
def test_product_recommendations_endpoint():
    client = APIClient()
    category = create_category("Tech")
    supplier = create_supplier("Tech Co")
    product_main = create_product("Main Gadget", "REC-1", category, supplier, price=Decimal("150.00"))
    product_related = create_product("Addon", "REC-2", category, supplier, price=Decimal("30.00"))
    ensure_inventory(product_main, 5)
    ensure_inventory(product_related, 5)

    user = create_user("rec@example.com")
    order = Order.objects.create(
        user=user,
        status=Order.Status.PAID,
        payment_status=Order.PaymentStatus.PAID,
        total_amount=Decimal("180.00"),
        shipping_address=ensure_address(user),
        billing_address=ensure_address(user),
    )
    OrderItem.objects.create(order=order, product=product_main, unit_price=Decimal("150.00"), quantity=1)
    OrderItem.objects.create(order=order, product=product_related, unit_price=Decimal("30.00"), quantity=1)

    resp = client.get(f"/api/products/{product_main.slug}/recommendations/")
    assert resp.status_code == 200
    slugs = [item["slug"] for item in resp.json()]
    assert product_related.slug in slugs


@pytest.mark.django_db
def test_content_page_endpoint():
    client = APIClient()
    page = ContentPage.objects.filter(slug='returns').first()
    assert page is not None
    resp = client.get("/api/pages/returns/")
    assert resp.status_code == 200
    assert resp.json()["slug"] == "returns"
