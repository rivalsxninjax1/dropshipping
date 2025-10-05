import pytest
from decimal import Decimal
from django.core.management import call_command

from store.models import Product, Order, OrderItem
from .factories import (
    create_user,
    create_category,
    create_supplier,
    create_product,
    ensure_inventory,
    ensure_address,
)


@pytest.mark.django_db
def test_product_ordering_by_created_at():
    cat = create_category("Cat1")
    sup = create_supplier("Sup1")
    p1 = create_product("A", "SKU-00001", cat, sup)
    p2 = create_product("B", "SKU-00002", cat, sup)
    # Default ordering is -created_at, so p2 comes first
    ids = list(Product.objects.values_list("id", flat=True))
    assert ids[0] == p2.id
    assert ids[-1] == p1.id


@pytest.mark.django_db
def test_inventory_deduction_from_order():
    user = create_user("buyer@example.com")
    addr = ensure_address(user)
    cat = create_category("Cat2")
    sup = create_supplier("Sup2")
    prod = create_product("Widget", "SKU-10000", cat, sup, price=Decimal("12.00"))
    inv = ensure_inventory(prod, 10)

    order = Order.objects.create(
        user=user,
        shipping_address=addr,
        billing_address=addr,
        total_amount=Decimal("0.00"),
    )
    OrderItem.objects.create(order=order, product=prod, unit_price=prod.base_price, quantity=3)

    order.apply_inventory()
    inv.refresh_from_db()
    assert inv.quantity == 7


@pytest.mark.django_db
def test_seed_sample_data_counts():
    call_command("seed_sample_data")
    from store.models import Category, Supplier, Product, User, Order

    assert Category.objects.count() >= 50
    assert Supplier.objects.count() == 5
    assert Product.objects.count() >= 200
    assert User.objects.count() >= 20
    assert Order.objects.count() >= 30

