import io
import random
from decimal import Decimal
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from PIL import Image

from store.models import (
    User,
    Category,
    Supplier,
    Product,
    Inventory,
    Address,
    Order,
    OrderItem,
)


def generate_placeholder_image(color=(200, 200, 200), size=(200, 200)) -> ContentFile:
    img = Image.new("RGB", size, color)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return ContentFile(buffer.getvalue(), name="placeholder.png")


class Command(BaseCommand):
    help = "Seed sample data: categories, suppliers, users, products with images, and orders"

    def handle(self, *args, **options):
        random.seed(42)

        # Users
        users = []
        admin_user, _ = User.objects.get_or_create(email="admin@example.com", defaults={
            "role": User.Role.ADMIN,
            "is_staff": True,
        })
        if not admin_user.has_usable_password():
            admin_user.set_password("admin123")
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        users.append(admin_user)

        for i in range(20):
            email = f"user{i}@example.com"
            user, _ = User.objects.get_or_create(email=email, defaults={
                "role": User.Role.CUSTOMER,
            })
            if not user.has_usable_password():
                user.set_password("password123")
                user.save(update_fields=["password"])
            users.append(user)

        # Suppliers
        suppliers = []
        for i in range(5):
            supplier, _ = Supplier.objects.get_or_create(name=f"Supplier {i+1}", defaults={
                "contact_email": f"supplier{i+1}@example.com",
                "active": True,
            })
            suppliers.append(supplier)

        # Categories (50)
        categories = []
        for i in range(50):
            name = f"Category {i+1}"
            cat, _ = Category.objects.get_or_create(name=name, slug=slugify(name), parent=None)
            categories.append(cat)

        # Products (200) with placeholder images
        products = []
        for i in range(200):
            title = f"Product {i+1}"
            category = random.choice(categories)
            supplier = random.choice(suppliers)
            sku = f"SKU-{i+1:05d}"
            base_price = Decimal(random.randint(500, 20000)) / 100  # 5.00 - 200.00
            product, _ = Product.objects.get_or_create(
                title=title,
                slug=slugify(title),
                category=category,
                supplier=supplier,
                sku=sku,
                defaults={
                    "description": f"Description for {title}",
                    "base_price": base_price,
                    "weight": Decimal("1.000"),
                    "dimensions": "10x10x10",
                    "active": True,
                },
            )
            if not product.images:
                product.images.save(f"{product.slug}.png", generate_placeholder_image(), save=True)
            Inventory.objects.get_or_create(product=product, defaults={"quantity": random.randint(5, 50)})
            products.append(product)

        # Addresses for users
        addresses = []
        for u in users:
            addr, _ = Address.objects.get_or_create(
                user=u,
                label="Home",
                defaults={
                    "address_line1": "123 Main St",
                    "city": "Metropolis",
                    "state": "CA",
                    "postal_code": "12345",
                    "country": "US",
                    "phone": "000-000-0000",
                    "is_default_shipping": True,
                    "is_default_billing": True,
                },
            )
            addresses.append(addr)

        # Orders (30) in various states
        order_statuses = [s for s, _ in Order.Status.choices]
        for i in range(30):
            user = random.choice(users)
            addr = Address.objects.filter(user=user).first() or random.choice(addresses)
            order = Order.objects.create(
                user=user,
                status=random.choice(order_statuses),
                total_amount=Decimal("0.00"),
                shipping_address=addr,
                billing_address=addr,
            )
            # 1-3 items
            line_total = Decimal("0.00")
            for _ in range(random.randint(1, 3)):
                prod = random.choice(products)
                qty = random.randint(1, 3)
                OrderItem.objects.create(
                    order=order,
                    product=prod,
                    unit_price=prod.base_price,
                    quantity=qty,
                )
                line_total += prod.base_price * qty

            order.total_amount = line_total.quantize(Decimal("0.01"))
            order.save(update_fields=["total_amount"])

        self.stdout.write(self.style.SUCCESS("seed_sample_data complete."))
