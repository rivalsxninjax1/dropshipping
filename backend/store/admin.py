from django.contrib import admin
from . import models
from .tasks import sync_supplier_products


@admin.register(models.User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "phone")
    ordering = ("-id",)


@admin.register(models.Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "parent")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(models.Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "contact_email", "active", "markup_type", "markup_value", "last_synced_at")
    list_filter = ("active", "markup_type")
    search_fields = ("name", "contact_email")
    actions = [
        "action_trigger_sync",
        "action_set_fixed_markup",
        "action_set_percent_markup",
        "action_map_supplier_skus",
    ]

    def action_trigger_sync(self, request, queryset):
        for supplier in queryset:
            sync_supplier_products.delay(supplier.id)
        self.message_user(request, f"Triggered sync for {queryset.count()} supplier(s).")

    action_trigger_sync.short_description = "Trigger product sync"

    def action_set_fixed_markup(self, request, queryset):
        updated = queryset.update(markup_type=models.Supplier.MarkupType.FIXED, markup_value=5)
        self.message_user(request, f"Set fixed markup for {updated} supplier(s).")

    action_set_fixed_markup.short_description = "Set fixed markup ($5)"

    def action_set_percent_markup(self, request, queryset):
        updated = queryset.update(markup_type=models.Supplier.MarkupType.PERCENT, markup_value=10)
        self.message_user(request, f"Set percent markup for {updated} supplier(s).")

    action_set_percent_markup.short_description = "Set percent markup (10%%)"

    def action_map_supplier_skus(self, request, queryset):
        # Simple auto-map: ensure SupplierProduct link exists for matching Product.sku
        count = 0
        for supplier in queryset:
            for product in models.Product.objects.filter(supplier=supplier):
                models.SupplierProduct.objects.update_or_create(
                    supplier=supplier,
                    product=product,
                    defaults={
                        "supplier_sku": product.sku,
                        "supplier_product_id": product.sku,
                    },
                )
                count += 1
        self.message_user(request, f"Mapped SKUs for {count} product(s).")

    action_map_supplier_skus.short_description = "Map supplier SKUs by local SKU"


@admin.register(models.Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "sku", "base_price", "active", "created_at")
    list_filter = ("active", "category", "supplier")
    search_fields = ("title", "sku")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(models.SupplierProduct)
class SupplierProductAdmin(admin.ModelAdmin):
    list_display = ("id", "supplier", "product", "supplier_sku", "supplier_product_id")
    search_fields = ("supplier_sku", "supplier_product_id")
    list_filter = ("supplier",)


@admin.register(models.Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ("product", "quantity", "stocked_at")
    search_fields = ("product__sku", "product__title")


@admin.register(models.Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "payment_status", "total_amount", "placed_at")
    list_filter = ("status", "payment_status", "placed_at")
    search_fields = ("user__email",)


@admin.register(models.OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product", "unit_price", "quantity")
    search_fields = ("order__id", "product__sku")


@admin.register(models.Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "provider", "amount", "status", "created_at")
    list_filter = ("provider", "status")
    search_fields = ("provider_payment_id",)


@admin.register(models.Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "discount_type", "value", "usage_limit", "per_user_limit", "is_active", "expires_at")
    list_filter = ("discount_type", "is_active")
    search_fields = ("code",)


@admin.register(models.CouponRedemption)
class CouponRedemptionAdmin(admin.ModelAdmin):
    list_display = ("id", "coupon", "user", "order", "redeemed_at")
    list_filter = ("coupon",)
    search_fields = ("coupon__code", "user__email")


@admin.register(models.Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "created_at", "updated_at")
    search_fields = ("user__email",)


@admin.register(models.WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ("id", "wishlist", "product", "added_at")
    search_fields = ("product__sku", "wishlist__user__email")


@admin.register(models.OrderStatusEvent)
class OrderStatusEventAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("order__id",)


@admin.register(models.ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "status", "created_at", "updated_at")
    list_filter = ("status",)
    search_fields = ("order__id", "order__user__email")


@admin.register(models.Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "notification_type", "channel", "created_at", "sent_at", "read_at")
    list_filter = ("notification_type", "channel")
    search_fields = ("user__email",)


@admin.register(models.Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "user", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("product__sku", "user__email")


@admin.register(models.Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "label", "city", "country", "is_default_shipping", "is_default_billing")
    list_filter = ("country", "is_default_shipping", "is_default_billing")
    search_fields = ("user__email", "city", "state", "postal_code")
