import pytest
from store.serializers import ProductSerializer
from .factory_boy import ProductFactory


@pytest.mark.django_db
def test_product_serializer_shape():
    p = ProductFactory()
    data = ProductSerializer(p).data
    assert set(["id","title","slug","description","base_price","sku","images","category","supplier","avg_rating","created_at","updated_at"]).issuperset(data.keys())

