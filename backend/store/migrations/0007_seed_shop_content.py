from datetime import timedelta

from django.db import migrations
from django.utils import timezone


def seed_shop_content(apps, schema_editor):
    Category = apps.get_model('store', 'Category')
    ContentPage = apps.get_model('store', 'ContentPage')
    Bundle = apps.get_model('store', 'Bundle')
    BundleItem = apps.get_model('store', 'BundleItem')
    Product = apps.get_model('store', 'Product')
    SizeGuide = apps.get_model('store', 'SizeGuide')

    ContentPage.objects.get_or_create(
        slug='returns',
        defaults={
            'title': 'Returns & Refunds',
            'body': (
                "<h2>Hassle-free returns</h2><p>We accept returns within 7 days of delivery for unworn items with original packaging. "
                "Email support@dropshipper.local with your order ID to start a pickup.</p>"
                "<h3>Refund timeline</h3><ul><li>Metro areas: 2-3 business days</li><li>Outside valley: 5-7 business days</li></ul>"
                "<p>For accessories and intimates we offer size exchanges or store credit.</p>"
            ),
            'hero_image': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
            'is_active': True,
        },
    )

    trending = [
        {
            'slug': 'tiktok-outfits',
            'name': 'TikTok Outfits',
            'tagline': 'Algorithm-approved fits for every viral dance.',
            'display_order': 1,
            'hero_image': 'https://images.unsplash.com/photo-1600181953167-dbe1bb1f14c3',
        },
        {
            'slug': 'nepali-streetwear',
            'name': 'Nepali Streetwear',
            'tagline': 'Local designers, global swagger.',
            'display_order': 2,
            'hero_image': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
        },
        {
            'slug': 'k-pop-fashion',
            'name': 'K-pop Fashion',
            'tagline': 'Stage-ready layers and shimmering details.',
            'display_order': 3,
            'hero_image': 'https://images.unsplash.com/photo-1542293787938-4d2226c02cdc',
        },
        {
            'slug': 'wedding-wear',
            'name': 'Wedding Wear',
            'tagline': 'Modern silhouettes for big-day moments.',
            'display_order': 4,
            'hero_image': 'https://images.unsplash.com/photo-1520854221050-0f4caff449fb',
        },
    ]
    for item in trending:
        category, _ = Category.objects.get_or_create(slug=item['slug'], defaults={'name': item['name']})
        Category.objects.filter(pk=category.pk).update(
            tagline=item['tagline'],
            hero_image=item['hero_image'],
            is_trending=True,
            display_order=item['display_order'],
        )

    apparel_categories = Category.objects.filter(slug__in=[t['slug'] for t in trending])
    for category in apparel_categories:
        SizeGuide.objects.update_or_create(
            category=category,
            defaults={
                'headline': f"Size guide for {category.name}",
                'content': (
                    "Chest, waist, and hip measurements are in inches. If you fall between sizes, size up for an oversized fit."),
            },
        )

    product_map = {product.sku: product for product in Product.objects.filter(sku__in=['AP-001', 'AP-002', 'FT-001', 'FT-002'])}
    top_bundle, created = Bundle.objects.get_or_create(
        slug='week-top-picks',
        defaults={
            'title': "This Week's Top Picks",
            'bundle_type': 'top_picks',
            'tagline': 'Creator-loved combination ready to ship.',
            'discount_percent': 10,
            'active': True,
        },
    )
    if created and product_map:
        items = [
            ('AP-001', 1, 1),
            ('FT-001', 1, 2),
            ('AP-002', 1, 3),
        ]
        for sku, qty, position in items:
            product = product_map.get(sku)
            if product:
                BundleItem.objects.create(bundle=top_bundle, product=product, quantity=qty, position=position)

    drop_bundle, drop_created = Bundle.objects.get_or_create(
        slug='limited-street-drop',
        defaults={
            'title': 'Limited Street Drop',
            'bundle_type': 'limited_drop',
            'tagline': 'Only this week: full streetwear fit + accessories.',
            'discount_amount': 15,
            'starts_at': timezone.now(),
            'countdown_ends_at': timezone.now() + timedelta(days=5),
            'active': True,
        },
    )
    if drop_created and product_map:
        items = [
            ('FT-002', 1, 1),
            ('AP-001', 1, 2),
        ]
        for sku, qty, position in items:
            product = product_map.get(sku)
            if product:
                BundleItem.objects.create(bundle=drop_bundle, product=product, quantity=qty, position=position)


def unseed_shop_content(apps, schema_editor):
    ContentPage = apps.get_model('store', 'ContentPage')
    ContentPage.objects.filter(slug='returns').delete()
    # Keep categories and bundles for stability


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0006_bundle_bundleitem_contentpage_productvariant_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_shop_content, unseed_shop_content),
    ]
