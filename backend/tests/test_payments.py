import pytest
from decimal import Decimal
from rest_framework.test import APIClient

from store.models import Order, Payment, Category, Product, Supplier, Inventory
from .factories import create_user, ensure_address


@pytest.mark.django_db
def test_esewa_webhook_flow_marks_paid(monkeypatch):
    client = APIClient()
    user = create_user("pay@example.com")
    client.force_authenticate(user)
    addr = ensure_address(user)

    cat = Category.objects.create(name="Cat", slug="cat")
    sup = Supplier.objects.create(name="Any", contact_email="x@example.com")
    p = Product.objects.create(title="T", slug="t", description="", base_price=Decimal("10.00"), sku="SKU-X", category=cat, supplier=sup, active=True)
    Inventory.objects.create(product=p, quantity=5)

    client.post("/api/cart/", {"product_id": p.id, "quantity": 1}, format="json")
    resp = client.post("/api/checkout/", {"shipping_address": addr.id, "billing_address": addr.id, "provider": "esewa"}, format="json")
    assert resp.status_code == 201
    order_id = resp.json()["order_id"]
    hook = client.post("/api/payments/webhook/", {"provider": "esewa", "order_id": order_id, "provider_payment_id": "esewa_ok_abc", "status": "success"}, format="json")
    assert hook.status_code == 200
    assert Order.objects.get(id=order_id).status == Order.Status.PAID


@pytest.mark.django_db
def test_khalti_webhook_flow_failure():
    client = APIClient()
    user = create_user("pay2@example.com")
    client.force_authenticate(user)
    addr = ensure_address(user)

    cat = Category.objects.create(name="Cat", slug="cat2")
    sup = Supplier.objects.create(name="Any2", contact_email="y@example.com")
    p = Product.objects.create(title="T2", slug="t2", description="", base_price=Decimal("8.00"), sku="SKU-Y", category=cat, supplier=sup, active=True)
    Inventory.objects.create(product=p, quantity=5)

    client.post("/api/cart/", {"product_id": p.id, "quantity": 1}, format="json")
    resp = client.post("/api/checkout/", {"shipping_address": addr.id, "billing_address": addr.id, "provider": "khalti"}, format="json")
    order_id = resp.json()["order_id"]
    # failure webhook
    hook = client.post("/api/payments/webhook/", {"provider": "khalti", "order_id": order_id, "provider_payment_id": "khalti_tok", "status": "failed"}, format="json")
    assert hook.status_code == 200
    assert Order.objects.get(id=order_id).status != Order.Status.PAID


@pytest.mark.django_db
def test_esewa_webhook_shape_refid_oid_success():
    # mirrors eSewa docs: payload with refId/oid/amt/status
    client = APIClient()
    user = create_user("esewauser@example.com")
    client.force_authenticate(user)
    addr = ensure_address(user)

    cat = Category.objects.create(name="CatE", slug="cate")
    sup = Supplier.objects.create(name="AnyE", contact_email="e@example.com")
    p = Product.objects.create(title="T", slug="t-esewa", description="", base_price=Decimal("11.00"), sku="SKU-E", category=cat, supplier=sup, active=True)
    Inventory.objects.create(product=p, quantity=5)

    client.post("/api/cart/", {"product_id": p.id, "quantity": 1}, format="json")
    resp = client.post("/api/checkout/", {"shipping_address": addr.id, "billing_address": addr.id, "provider": "esewa"}, format="json")
    order_id = resp.json()["order_id"]

    hook = client.post("/api/payments/webhook/", {"provider": "esewa", "order_id": order_id, "refId": "esewa_ok_ref", "oid": str(order_id), "amt": "11.00", "status": "success"}, format="json")
    assert hook.status_code == 200
    assert Order.objects.get(id=order_id).status == Order.Status.PAID


@pytest.mark.django_db
def test_khalti_webhook_shape_token_success():
    # mirrors Khalti docs: payload with token + status
    client = APIClient()
    user = create_user("khaltiuser@example.com")
    client.force_authenticate(user)
    addr = ensure_address(user)

    cat = Category.objects.create(name="CatK", slug="catk")
    sup = Supplier.objects.create(name="AnyK", contact_email="k@example.com")
    p = Product.objects.create(title="T", slug="t-khalti", description="", base_price=Decimal("12.00"), sku="SKU-K", category=cat, supplier=sup, active=True)
    Inventory.objects.create(product=p, quantity=5)

    client.post("/api/cart/", {"product_id": p.id, "quantity": 1}, format="json")
    resp = client.post("/api/checkout/", {"shipping_address": addr.id, "billing_address": addr.id, "provider": "khalti"}, format="json")
    order_id = resp.json()["order_id"]

    hook = client.post("/api/payments/webhook/", {"provider": "khalti", "order_id": order_id, "token": "khalti_ok_tok", "status": "success"}, format="json")
    assert hook.status_code == 200
    assert Order.objects.get(id=order_id).status == Order.Status.PAID


@pytest.mark.django_db
def test_admin_refund_endpoint():
    client = APIClient()
    admin = create_user("admin@example.com")
    admin.is_staff = True
    admin.save()
    client.force_authenticate(admin)

    # Create paid order and payment
    cat = Category.objects.create(name="Cat3", slug="cat3")
    sup = Supplier.objects.create(name="Any3", contact_email="z@example.com")
    p = Product.objects.create(title="T3", slug="t3", description="", base_price=Decimal("12.00"), sku="SKU-Z", category=cat, supplier=sup, active=True)
    Inventory.objects.create(product=p, quantity=5)
    customer = create_user("cust@example.com")
    addr = ensure_address(customer)
    order = Order.objects.create(user=customer, status=Order.Status.PAID, total_amount=Decimal("12.00"), shipping_address=addr, billing_address=addr)
    pay = Payment.objects.create(order=order, provider=Payment.Provider.OTHER, provider_payment_id="x", amount=order.total_amount, status=Payment.Status.SUCCEEDED)

    resp = client.post(f"/api/admin/payments/{pay.id}/refund/", {"amount": str(order.total_amount)}, format="json")
    assert resp.status_code == 200
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED
