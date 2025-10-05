import json
import pytest
import responses

from store.models import Supplier
from store.adapters.aliexpress import AliExpressAdapter
from store.adapters.cj import CJAdapter


@pytest.mark.django_db
@responses.activate
def test_aliexpress_adapter_fetch_products_http():
    supplier = Supplier.objects.create(name="AliExpress", contact_email="ali@example.com", api_credentials={"api_key": "k"})
    adapter = AliExpressAdapter(supplier)

    responses.add(
        responses.GET,
        f"{adapter.API_BASE}/products",
        json={"items": [{"id": 1, "title": "A", "price": 12.5, "stock": 3, "images": ["u"], "sku": "AX-1", "category": "Cat"}], "has_next": False},
        status=200,
    )
    products, has_next = adapter.fetch_products(page=1)
    assert not has_next
    assert len(products) == 1
    assert products[0]["sku"] == "AX-1"


@pytest.mark.django_db
@responses.activate
def test_cj_adapter_fetch_details_http():
    supplier = Supplier.objects.create(name="CJ", contact_email="cj@example.com", api_credentials={"api_key": "k", "base_url": "https://cj.example"})
    adapter = CJAdapter(supplier)

    responses.add(responses.GET, f"{supplier.api_credentials['base_url']}/products/123", json={"id": 123, "title": "Cool", "price": 9.99, "stock": 10, "images": [], "sku": "CJ-123"}, status=200)
    details = adapter.fetch_product_details("123")
    assert details["sku"] == "CJ-123"
    assert details["price"] == 9.99

