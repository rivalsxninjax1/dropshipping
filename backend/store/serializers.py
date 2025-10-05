from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import get_user_model
from .models import (
    Product,
    Category,
    Supplier,
    Order,
    OrderItem,
    Review,
    Address,
    Coupon,
    Wishlist,
    WishlistItem,
    ReturnRequest,
    Notification,
    OrderStatusEvent,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent"]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "contact_email", "active", "markup_type", "markup_value", "external_id", "last_synced_at"]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    supplier = SupplierSerializer(read_only=True)
    avg_rating = serializers.FloatField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "base_price",
            "sku",
            "images",
            "video_url",
            "gallery",
            "brand",
            "category",
            "supplier",
            "avg_rating",
            "shipping_time_min_days",
            "shipping_time_max_days",
            "attributes",
            "active",
            "created_at",
            "updated_at",
        ]


class ProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "base_price",
            "sku",
            "images",
            "video_url",
            "gallery",
            "brand",
            "category",
            "supplier",
            "shipping_time_min_days",
            "shipping_time_max_days",
            "attributes",
            "active",
        ]


class ReviewCreateSerializer(serializers.ModelSerializer):
    moderation = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Review
        fields = ["id", "product", "rating", "comment", "moderation", "created_at"]
        read_only_fields = ("created_at",)


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(source="product", queryset=Product.objects.all(), write_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_id", "unit_price", "quantity", "variant_info"]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ["id", "code", "discount_type", "value", "min_order_total", "per_user_limit", "usage_limit", "is_active", "expires_at"]


class OrderStatusEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusEvent
        fields = ["id", "status", "note", "created_at"]


class ReturnRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnRequest
        fields = [
            "id",
            "order",
            "order_item",
            "status",
            "reason",
            "resolution",
            "attachments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("status", "created_at", "updated_at")
        extra_kwargs = {
            "order": {"write_only": True},
            "order_item": {"write_only": True, "required": False},
        }


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    coupon = CouponSerializer(read_only=True)
    events = OrderStatusEventSerializer(many=True, read_only=True)
    return_requests = ReturnRequestSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "payment_status",
            "total_amount",
            "discount_amount",
            "coupon",
            "shipping_address",
            "billing_address",
            "shipping_method",
            "tracking_number",
            "estimated_delivery_at",
            "placed_at",
            "items",
            "events",
            "return_requests",
        ]
        read_only_fields = ("placed_at",)

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        order = Order.objects.create(**validated_data)
        for item in items_data:
            OrderItem.objects.create(order=order, **item)
        return order


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role", "is_active", "is_staff"]


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(validators=[UniqueValidator(queryset=User.objects.all(), message="Email already registered")])
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create(is_active=True, **validated_data)
        user.set_password(password)
        user.save()
        Wishlist.objects.get_or_create(user=user)
        return user


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "label",
            "address_line1",
            "city",
            "state",
            "postal_code",
            "country",
            "phone",
            "is_default_shipping",
            "is_default_billing",
        ]


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(source="product", queryset=Product.objects.all(), write_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "product_id", "added_at"]


class WishlistSerializer(serializers.ModelSerializer):
    items = WishlistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "user", "items", "created_at", "updated_at"]
        read_only_fields = ("user", "created_at", "updated_at")


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "channel",
            "payload",
            "sent_at",
            "read_at",
            "created_at",
        ]


class LowStockProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    sku = serializers.CharField()
    quantity = serializers.IntegerField()
    safety_stock = serializers.IntegerField()


class AdminOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    events = OrderStatusEventSerializer(many=True, read_only=True)
    return_requests = ReturnRequestSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "status",
            "payment_status",
            "total_amount",
            "discount_amount",
            "coupon",
            "shipping_address",
            "billing_address",
            "shipping_method",
            "tracking_number",
            "estimated_delivery_at",
            "placed_at",
            "items",
            "events",
            "return_requests",
        ]
        read_only_fields = ("user", "total_amount", "discount_amount", "coupon", "placed_at", "items", "events", "return_requests")
