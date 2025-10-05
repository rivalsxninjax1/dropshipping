import pytest
from decimal import Decimal

from store.models import Supplier, Category, Product, Inventory, Order, OrderItem, Address, User
from store.tasks import sync_supplier_products, auto_forward_order_to_supplier


class FakeAdapter:
    def __init__(self, supplier):
        self.supplier = supplier
        self.pages = 0

    def fetch_products(self, page=1):
        if page > 1:
            return [], False
        return [
            {"id": "p1", "title": "Widget", "price": 10.0, "stock": 7, "images": [], "sku": "W-1", "category": "Gadgets"}
        ], False

    def fetch_product_details(self, supplier_product_id):
        return {"id": supplier_product_id}

    def place_order(self, payload):
        return {"supplier_order_id": f"S-{payload['order_ref']}"}

    def get_order_status(self, supplier_order_id):
        return {"status": "processing"}


@pytest.fixture(autouse=True)
def patch_registry(monkeypatch):
    from store import adapters

    def fake_get_adapter(supplier):
        return FakeAdapter(supplier)

    monkeypatch.setattr(adapters.base, "get_adapter_for_supplier", fake_get_adapter)
    yield


@pytest.mark.django_db
def test_sync_supplier_products_creates_products():
    s = Supplier.objects.create(name="AliExpress", contact_email="x@example.com")
    count = sync_supplier_products.apply(args=(s.id,)).get()
    assert count >= 1
    p = Product.objects.get(sku="W-1")
    assert p.inventory.quantity == 7


@pytest.mark.django_db
def test_auto_forward_order_places_supplier_order():
    s = Supplier.objects.create(name="CJ", contact_email="cj@example.com")
    cat = Category.objects.create(name="Cat", slug="cat")
    p = Product.objects.create(title="T", slug="t", description="", base_price=Decimal("5.00"), sku="SKU-1", category=cat, supplier=s, active=True)
    Inventory.objects.create(product=p, quantity=10)
    u = User.objects.create(email="u@example.com")
    addr = Address.objects.create(user=u, label="home", address_line1="123", city="c", state="s", postal_code="00000", country="US")
    o = Order.objects.create(user=u, status=Order.Status.PAID, total_amount=Decimal("5.00"), shipping_address=addr, billing_address=addr)
    OrderItem.objects.create(order=o, product=p, unit_price=p.base_price, quantity=1)

    res = auto_forward_order_to_supplier.apply(args=(o.id,)).get()
    assert "CJ" in res
