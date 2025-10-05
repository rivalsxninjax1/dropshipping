from decimal import Decimal
from django.utils.text import slugify
from store.models import User, Category, Supplier, Product, Inventory, Address


def create_user(email: str = "user@example.com", password: str = "password123") -> User:
    user, _ = User.objects.get_or_create(email=email, defaults={"role": User.Role.CUSTOMER})
    if not user.has_usable_password():
        user.set_password(password)
        user.save(update_fields=["password"])
    return user


def create_category(name: str = "Category") -> Category:
    return Category.objects.create(name=name, slug=slugify(name))


def create_supplier(name: str = "Supplier") -> Supplier:
    return Supplier.objects.create(name=name, contact_email="supplier@example.com")


def create_product(title: str = "Product", sku: str = "SKU-00001", category: Category | None = None, supplier: Supplier | None = None, price: Decimal = Decimal("9.99")) -> Product:
    if category is None:
        category = create_category()
    if supplier is None:
        supplier = create_supplier()
    product = Product.objects.create(
        title=title,
        slug=slugify(title),
        description="",
        base_price=price,
        sku=sku,
        category=category,
        supplier=supplier,
        active=True,
    )
    return product


def ensure_inventory(product: Product, qty: int = 10) -> Inventory:
    inv, _ = Inventory.objects.get_or_create(product=product, defaults={"quantity": qty})
    if inv.quantity != qty:
        inv.quantity = qty
        inv.save(update_fields=["quantity"])
    return inv


def ensure_address(user: User) -> Address:
    addr, _ = Address.objects.get_or_create(
        user=user,
        label="Home",
        defaults=dict(
            address_line1="123 Main St",
            city="City",
            state="ST",
            postal_code="00000",
            country="US",
            is_default_billing=True,
            is_default_shipping=True,
        ),
    )
    return addr

