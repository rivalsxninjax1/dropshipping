import pytest
from decimal import Decimal
from rest_framework.test import APIClient

from store.models import Review, Order
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
def test_checkout_and_webhook_success():
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
    hook = client.post("/api/payments/webhook/", {"provider": "esewa", "order_id": order_id, "provider_payment_id": "esewa_ok_1", "status": "success"}, format="json")
    assert hook.status_code == 200
    assert Order.objects.get(id=order_id).status == Order.Status.PAID
