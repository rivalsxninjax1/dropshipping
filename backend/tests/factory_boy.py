import factory
from decimal import Decimal
from django.utils.text import slugify
from store import models


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    role = models.User.Role.CUSTOMER
    password = factory.PostGenerationMethodCall('set_password', 'password123')


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Category

    name = factory.Sequence(lambda n: f"Category {n}")
    slug = factory.LazyAttribute(lambda o: slugify(o.name))


class SupplierFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Supplier

    name = factory.Sequence(lambda n: f"Supplier {n}")
    contact_email = factory.LazyAttribute(lambda o: f"{slugify(o.name)}@example.com")


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Product

    title = factory.Sequence(lambda n: f"Product {n}")
    slug = factory.LazyAttribute(lambda o: slugify(o.title))
    description = ""
    base_price = Decimal("9.99")
    sku = factory.Sequence(lambda n: f"SKU-{n:05d}")
    category = factory.SubFactory(CategoryFactory)
    supplier = factory.SubFactory(SupplierFactory)
    active = True


class InventoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Inventory

    product = factory.SubFactory(ProductFactory)
    quantity = 10

