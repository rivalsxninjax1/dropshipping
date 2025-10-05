from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from store.models import Category, Inventory, Product


CATEGORY_SAMPLES = [
    {
        "name": "Electronics",
        "slug": "electronics",
        "products": [
            {
                "sku": "EL-001",
                "title": "Noise Cancelling Headphones",
                "description": "Wireless over-ear headphones with active noise cancelling and 28-hour battery life.",
                "price": Decimal("189.00"),
                "quantity": 25,
                "brand": "AcoustiCalm",
                "weight": Decimal("0.320"),
                "dimensions": "18x16x8 cm",
                "attributes": {
                    "color": "charcoal",
                    "connectivity": ["Bluetooth 5.2", "3.5mm aux"],
                    "battery_life_hours": 28,
                },
            },
            {
                "sku": "EL-002",
                "title": "Smart Home Hub",
                "description": "Voice-enabled smart hub with Zigbee and Matter support for centralised home automation.",
                "price": Decimal("129.00"),
                "quantity": 18,
                "brand": "PulseLink",
                "weight": Decimal("0.420"),
                "dimensions": "12x12x6 cm",
                "attributes": {
                    "protocols": ["Zigbee", "WiFi", "Matter"],
                    "voice_assistant": "Yes",
                    "includes_speakers": True,
                },
            },
            {
                "sku": "EL-003",
                "title": "4K Action Camera",
                "description": "Waterproof action camera with stabilisation and companion mobile app.",
                "price": Decimal("249.00"),
                "quantity": 15,
                "brand": "TrailShot",
                "weight": Decimal("0.180"),
                "dimensions": "6x4x3 cm",
                "attributes": {
                    "resolution": "4K60",
                    "water_resistance_m": 30,
                    "storage": "MicroSD up to 512GB",
                },
            },
        ],
    },
    {
        "name": "Home & Kitchen",
        "slug": "home-and-kitchen",
        "products": [
            {
                "sku": "HK-001",
                "title": "Cast Iron Skillet",
                "description": "Pre-seasoned cast iron skillet suitable for stovetop, oven, and grill cooking.",
                "price": Decimal("59.00"),
                "quantity": 22,
                "brand": "IronRoot",
                "weight": Decimal("2.500"),
                "dimensions": "30 cm diameter",
                "attributes": {
                    "material": "cast iron",
                    "pre_seasoned": True,
                    "oven_safe_temp_c": 260,
                },
            },
            {
                "sku": "HK-002",
                "title": "Pour-over Coffee Maker",
                "description": "Glass pour-over set with double-layer stainless filter and 600ml capacity.",
                "price": Decimal("42.00"),
                "quantity": 28,
                "brand": "MorningBloom",
                "weight": Decimal("0.650"),
                "dimensions": "19x14x14 cm",
                "attributes": {
                    "capacity_ml": 600,
                    "filter_type": "double stainless",
                    "dishwasher_safe": True,
                },
            },
            {
                "sku": "HK-003",
                "title": "Bamboo Cutting Board",
                "description": "Three-layer bamboo cutting board with juice groove and non-slip feet.",
                "price": Decimal("29.00"),
                "quantity": 35,
                "brand": "HarvestWood",
                "weight": Decimal("1.200"),
                "dimensions": "40x30x2 cm",
                "attributes": {
                    "material": "bamboo",
                    "reversible": True,
                    "maintenance": "hand wash",
                },
            },
        ],
    },
    {
        "name": "Fitness & Outdoors",
        "slug": "fitness-and-outdoors",
        "products": [
            {
                "sku": "FO-001",
                "title": "Adjustable Kettlebell",
                "description": "Compact adjustable kettlebell with five quick-switch weight plates.",
                "price": Decimal("139.00"),
                "quantity": 16,
                "brand": "FormFlex",
                "weight": Decimal("11.500"),
                "dimensions": "25x20x30 cm",
                "attributes": {
                    "min_weight_kg": 5,
                    "max_weight_kg": 18,
                    "plate_material": "steel",
                },
            },
            {
                "sku": "FO-002",
                "title": "Insulated Water Bottle",
                "description": "Vacuum insulated stainless steel bottle keeps drinks cold for 24 hours.",
                "price": Decimal("32.00"),
                "quantity": 40,
                "brand": "SummitHydro",
                "weight": Decimal("0.480"),
                "dimensions": "28x8x8 cm",
                "attributes": {
                    "capacity_ml": 750,
                    "bpa_free": True,
                    "includes_carabiner": True,
                },
            },
            {
                "sku": "FO-003",
                "title": "Trail Running Backpack",
                "description": "Lightweight running backpack with hydration bladder and reflective panels.",
                "price": Decimal("119.00"),
                "quantity": 14,
                "brand": "StridePeak",
                "weight": Decimal("0.620"),
                "dimensions": "45x26x10 cm",
                "attributes": {
                    "hydration_capacity_l": 2,
                    "pockets": 6,
                    "rain_cover": True,
                },
            },
        ],
    },
    {
        "name": "Fashion",
        "slug": "fashion",
        "products": [
            {
                "sku": "FA-001",
                "title": "Organic Cotton T-Shirt",
                "description": "Classic fit t-shirt made from 100% organic cotton with pre-shrunk fabric.",
                "price": Decimal("34.00"),
                "quantity": 50,
                "brand": "Everthread",
                "weight": Decimal("0.210"),
                "dimensions": "Size guide S-XL",
                "attributes": {
                    "fabric": "organic cotton",
                    "fit": "classic",
                    "care": "machine wash cold",
                },
            },
            {
                "sku": "FA-002",
                "title": "Vegetable-Tanned Leather Wallet",
                "description": "Slim leather wallet with RFID blocking and quick-access card slot.",
                "price": Decimal("79.00"),
                "quantity": 30,
                "brand": "Northbound",
                "weight": Decimal("0.110"),
                "dimensions": "11x8x1.5 cm",
                "attributes": {
                    "material": "vegetable-tanned leather",
                    "rfid_blocking": True,
                    "card_slots": 6,
                },
            },
            {
                "sku": "FA-003",
                "title": "Wool Blend Beanie",
                "description": "Ribbed knit beanie made from merino wool blend with moisture-wicking lining.",
                "price": Decimal("28.00"),
                "quantity": 34,
                "brand": "Hearthline",
                "weight": Decimal("0.140"),
                "dimensions": "One size",
                "attributes": {
                    "material": "merino wool blend",
                    "lining": "polyester",
                    "care": "hand wash",
                },
            },
        ],
    },
    {
        "name": "Books & Media",
        "slug": "books-and-media",
        "products": [
            {
                "sku": "BM-001",
                "title": "Data Science Handbook",
                "description": "Field guide covering practical machine learning workflows and deployment patterns.",
                "price": Decimal("54.00"),
                "quantity": 26,
                "brand": "Insights Press",
                "weight": Decimal("0.920"),
                "dimensions": "24x17x3 cm",
                "attributes": {
                    "format": "hardcover",
                    "pages": 432,
                    "isbn": "978-1-23456-789-0",
                },
            },
            {
                "sku": "BM-002",
                "title": "Productivity Planner",
                "description": "Undated weekly planner with habit tracking and review prompts.",
                "price": Decimal("24.00"),
                "quantity": 38,
                "brand": "Focus Studio",
                "weight": Decimal("0.460"),
                "dimensions": "21x15x2 cm",
                "attributes": {
                    "format": "hardcover",
                    "pages": 192,
                    "layout": "weekly",
                },
            },
            {
                "sku": "BM-003",
                "title": "Mindfulness Audio Course",
                "description": "Six-week guided mindfulness audio programme with downloadable workbook.",
                "price": Decimal("39.00"),
                "quantity": 60,
                "brand": "Stillmind",
                "weight": Decimal("0.050"),
                "dimensions": "Digital access card",
                "attributes": {
                    "format": "audio + PDF",
                    "duration_hours": 12,
                    "access": "lifetime",
                },
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed sample categories with products"

    def handle(self, *args, **options):
        created_categories = 0
        created_products = 0

        for category_data in CATEGORY_SAMPLES:
            slug = category_data.get("slug") or slugify(category_data["name"])
            category, cat_created = Category.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": category_data["name"],
                    "parent": None,
                },
            )
            created_categories += 1 if cat_created else 0

            for product in category_data.get("products", []):
                product_defaults = {
                    "title": product["title"],
                    "slug": slugify(product["title"]),
                    "description": product["description"],
                    "base_price": product["price"],
                    "category": category,
                    "brand": product.get("brand", ""),
                    "weight": product.get("weight", Decimal("0.000")),
                    "dimensions": product.get("dimensions", ""),
                    "attributes": product.get("attributes", {}),
                    "active": product.get("active", True),
                }

                if product.get("video_url"):
                    product_defaults["video_url"] = product["video_url"]

                obj, prod_created = Product.objects.update_or_create(
                    sku=product["sku"],
                    defaults=product_defaults,
                )
                created_products += 1 if prod_created else 0

                Inventory.objects.update_or_create(
                    product=obj,
                    defaults={"quantity": product.get("quantity", 20)},
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete. Categories created: {created_categories}, products created: {created_products}."
            )
        )
