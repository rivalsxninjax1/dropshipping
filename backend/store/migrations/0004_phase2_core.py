from decimal import Decimal
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0003_alter_user_options_alter_user_managers_user_groups_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="external_id",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AddField(
            model_name="supplier",
            name="last_synced_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="product",
            name="attributes",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="product",
            name="brand",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="product",
            name="gallery",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="product",
            name="shipping_time_max_days",
            field=models.PositiveIntegerField(default=12),
        ),
        migrations.AddField(
            model_name="product",
            name="shipping_time_min_days",
            field=models.PositiveIntegerField(default=5),
        ),
        migrations.AddField(
            model_name="product",
            name="video_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="inventory",
            name="safety_stock",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="order",
            name="coupon",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orders", to="store.coupon"),
        ),
        migrations.AddField(
            model_name="order",
            name="discount_amount",
            field=models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=10),
        ),
        migrations.AddField(
            model_name="order",
            name="estimated_delivery_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_status",
            field=models.CharField(choices=[("pending", "Pending"), ("authorized", "Authorized"), ("paid", "Paid"), ("failed", "Failed"), ("refunded", "Refunded")], default="pending", max_length=16),
        ),
        migrations.AddField(
            model_name="order",
            name="shipping_method",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="order",
            name="tracking_number",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="coupon",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="coupon",
            name="min_order_total",
            field=models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=10),
        ),
        migrations.AddField(
            model_name="coupon",
            name="per_user_limit",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notification_type", models.CharField(choices=[("order_update", "Order update"), ("abandoned_cart", "Abandoned cart"), ("promotion", "Promotion")], max_length=32)),
                ("channel", models.CharField(choices=[("email", "Email"), ("push", "Push"), ("sms", "SMS")], default="email", max_length=16)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notifications", to="store.user")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Wishlist",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="wishlist", to="store.user")),
            ],
        ),
        migrations.CreateModel(
            name="CouponRedemption",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("redeemed_at", models.DateTimeField(auto_now_add=True)),
                ("coupon", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="redemptions", to="store.coupon")),
                ("order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="coupon_redemptions", to="store.order")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="coupon_redemptions", to="store.user")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["redeemed_at"], name="store_coupon_redemptions_redeemed_at_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="OrderStatusEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("paid", "Paid"), ("processing", "Processing"), ("shipped", "Shipped"), ("delivered", "Delivered"), ("cancelled", "Cancelled"), ("refunded", "Refunded")], max_length=16)),
                ("note", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="store.order")),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="ReturnRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected"), ("received", "Received"), ("refunded", "Refunded")], default="pending", max_length=16)),
                ("reason", models.TextField()),
                ("resolution", models.TextField(blank=True)),
                ("attachments", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="return_requests", to="store.order")),
                ("order_item", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="return_requests", to="store.orderitem")),
            ],
        ),
        migrations.CreateModel(
            name="WishlistItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("added_at", models.DateTimeField(auto_now_add=True)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="store.product")),
                ("wishlist", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="store.wishlist")),
            ],
            options={
                "unique_together": {("wishlist", "product")},
            },
        ),
        migrations.AddField(
            model_name="wishlist",
            name="products",
            field=models.ManyToManyField(related_name="wishlists", through="store.WishlistItem", to="store.product"),
        ),
    ]
