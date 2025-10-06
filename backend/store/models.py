from decimal import Decimal
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The Email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        ADMIN = "admin", "Admin"
        SUPPLIER = "supplier", "Supplier"

    username = None  # remove username
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.CUSTOMER)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email


class Category(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    parent = models.ForeignKey("self", null=True, blank=True, related_name="children", on_delete=models.CASCADE)
    hero_image = models.URLField(blank=True)
    tagline = models.CharField(max_length=160, blank=True)
    is_trending = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["name"]),
            models.Index(fields=["is_trending", "display_order"]),
        ]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Supplier(models.Model):
    name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    api_credentials = models.JSONField(null=True, blank=True)
    active = models.BooleanField(default=True)
    external_id = models.CharField(max_length=128, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    # Markup rules for pricing (fixed amount or percent)
    class MarkupType(models.TextChoices):
        FIXED = "fixed", "Fixed"
        PERCENT = "percent", "Percent"

    markup_type = models.CharField(max_length=10, choices=MarkupType.choices, default=MarkupType.PERCENT)
    markup_value = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("10.00"))

    def __str__(self):
        return self.name


class Product(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    sku = models.CharField(max_length=64)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    images = models.ImageField(upload_to="products/", null=True, blank=True)
    video_url = models.URLField(blank=True)
    gallery = models.JSONField(default=list, blank=True)
    brand = models.CharField(max_length=120, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=3, default=Decimal("0.000"))
    dimensions = models.CharField(max_length=128, blank=True)
    shipping_time_min_days = models.PositiveIntegerField(default=5)
    shipping_time_max_days = models.PositiveIntegerField(default=12)
    attributes = models.JSONField(default=dict, blank=True)
    size_fit_notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["sku", "supplier"], name="uniq_sku_supplier"),
        ]
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["title"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.sku})"


class SupplierProduct(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="supplier_links")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="supplier_links")
    supplier_sku = models.CharField(max_length=128)
    supplier_product_id = models.CharField(max_length=128)
    sync_meta = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "supplier"], name="uniq_product_supplier_link"),
        ]
        indexes = [
            models.Index(fields=["supplier_sku"]),
        ]

    def __str__(self):
        return f"{self.supplier.name}:{self.supplier_sku} -> {self.product.sku}"


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    size = models.CharField(max_length=32, blank=True)
    color = models.CharField(max_length=64, blank=True)
    sku = models.CharField(max_length=80, blank=True)
    price_modifier = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    stock = models.PositiveIntegerField(default=0)
    position = models.PositiveIntegerField(default=0)
    is_default = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "size", "color", "sku"], name="uniq_product_variant_option"),
        ]
        ordering = ["position", "id"]

    def __str__(self):
        parts = [self.product.sku]
        if self.size:
            parts.append(self.size)
        if self.color:
            parts.append(self.color)
        return " | ".join(parts)


class Inventory(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory")
    quantity = models.IntegerField(validators=[MinValueValidator(0)], default=0)
    stocked_at = models.DateTimeField(default=timezone.now)
    safety_stock = models.PositiveIntegerField(default=0)

    def deduct(self, amount: int):
        if amount < 0:
            raise ValueError("Cannot deduct negative amount")
        if amount > self.quantity:
            raise ValueError("Insufficient inventory")
        self.quantity -= amount
        self.save(update_fields=["quantity"])

    def __str__(self):
        return f"{self.product.sku}: {self.quantity}"


class Bundle(models.Model):
    class BundleType(models.TextChoices):
        CURATED = "curated", "Curated"
        LIMITED_DROP = "limited_drop", "Limited Drop"
        TOP_PICKS = "top_picks", "Top Picks"

    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=160, unique=True)
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=160, blank=True)
    hero_image = models.ImageField(upload_to="bundles/", blank=True, null=True)
    bundle_type = models.CharField(max_length=32, choices=BundleType.choices, default=BundleType.CURATED)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    countdown_ends_at = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def is_live(self) -> bool:
        now = timezone.now()
        if not self.active:
            return False
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        return True

    def base_price(self) -> Decimal:
        total = Decimal("0.00")
        for item in self.items.select_related("product"):
            total += item.extended_price
        return total.quantize(Decimal("0.01"))

    def final_price(self) -> Decimal:
        price = self.base_price()
        if self.discount_percent:
            price = price * (Decimal("1.00") - self.discount_percent / Decimal("100.00"))
        if self.discount_amount:
            price = price - self.discount_amount
        if price < Decimal("0.00"):
            price = Decimal("0.00")
        return price.quantize(Decimal("0.01"))


class BundleItem(models.Model):
    bundle = models.ForeignKey(Bundle, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="bundle_items")
    quantity = models.PositiveIntegerField(default=1)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["bundle", "product"], name="uniq_product_bundle"),
        ]
        ordering = ["position", "id"]

    @property
    def extended_price(self) -> Decimal:
        base = self.product.base_price
        return (base * self.quantity).quantize(Decimal("0.01"))

    def __str__(self):
        return f"{self.bundle.title} -> {self.product.title}"


class SizeGuide(models.Model):
    category = models.OneToOneField(Category, on_delete=models.CASCADE, related_name="size_guide")
    headline = models.CharField(max_length=160)
    content = models.TextField()
    measurement_image = models.ImageField(upload_to="size-guides/", blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Size guide for {self.category.name}"


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=64, blank=True)
    address_line1 = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=2)
    phone = models.CharField(max_length=32, blank=True)
    is_default_shipping = models.BooleanField(default=False)
    is_default_billing = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.label or 'Address'} for {self.user.email}"


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        AUTHORIZED = "authorized", "Authorized"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    coupon = models.ForeignKey("Coupon", null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    referral_coupon = models.ForeignKey(
        "Coupon",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="referral_orders",
    )
    shipping_address = models.ForeignKey(Address, on_delete=models.PROTECT, related_name="shipping_orders")
    billing_address = models.ForeignKey(Address, on_delete=models.PROTECT, related_name="billing_orders")
    shipping_method = models.CharField(max_length=120, blank=True)
    tracking_number = models.CharField(max_length=120, blank=True)
    estimated_delivery_at = models.DateTimeField(null=True, blank=True)
    placed_at = models.DateTimeField(auto_now_add=True)
    supplier_order_ids = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["placed_at"]),
        ]
        ordering = ["-placed_at"]

    def apply_inventory(self):
        for item in self.items.all():
            inv = getattr(item.product, "inventory", None)
            if inv is None:
                inv = Inventory.objects.create(product=item.product, quantity=0)
            inv.deduct(item.quantity)

    def __str__(self):
        return f"Order #{self.pk} by {self.user.email}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    variant_info = models.JSONField(default=dict, blank=True)

    def line_total(self) -> Decimal:
        return (self.unit_price * self.quantity).quantize(Decimal("0.01"))

    def __str__(self):
        return f"{self.product.sku} x {self.quantity}"


class Payment(models.Model):
    class Provider(models.TextChoices):
        STRIPE = "stripe", "Stripe"
        PAYPAL = "paypal", "PayPal"
        ESEWA = "esewa", "eSewa"
        KHALTI = "khalti", "Khalti"
        COD = "cod", "Cash on Delivery"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=16, choices=Provider.choices)
    provider_payment_id = models.CharField(max_length=128)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["provider_payment_id"]),
        ]


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENT = "percent", "Percent"
        FIXED = "fixed", "Fixed"

    code = models.CharField(max_length=32, unique=True)
    discount_type = models.CharField(max_length=16, choices=DiscountType.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    usage_limit = models.PositiveIntegerField(default=0)
    per_user_limit = models.PositiveIntegerField(default=0)
    min_order_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_referral = models.BooleanField(default=False)
    influencer_name = models.CharField(max_length=120, blank=True)
    influencer_handle = models.CharField(max_length=120, blank=True)
    referral_url = models.URLField(blank=True)

    def is_valid(self) -> bool:
        if not self.is_active:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True


class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_purchase = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.product.sku} review by {self.user.email}: {self.rating}"


class ReviewMedia(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="media")
    image = models.ImageField(upload_to="reviews/")
    alt_text = models.CharField(max_length=140, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ReviewMedia(review={self.review_id})"


class Wishlist(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="wishlist")
    products = models.ManyToManyField(Product, through="WishlistItem", related_name="wishlists")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wishlist for {self.user.email}"


class WishlistItem(models.Model):
    wishlist = models.ForeignKey(Wishlist, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("wishlist", "product")

    def __str__(self):
        return f"{self.product.sku} in wishlist {self.wishlist_id}"


class CouponRedemption(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="redemptions")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="coupon_redemptions")
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL, related_name="coupon_redemptions")
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["redeemed_at"]),
        ]


class OrderStatusEvent(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    status = models.CharField(max_length=16, choices=Order.Status.choices)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Order {self.order_id} -> {self.status}"


class ReturnRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        RECEIVED = "received", "Received"
        REFUNDED = "refunded", "Refunded"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="return_requests")
    order_item = models.ForeignKey(OrderItem, null=True, blank=True, on_delete=models.CASCADE, related_name="return_requests")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    reason = models.TextField()
    resolution = models.TextField(blank=True)
    attachments = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ReturnRequest(order={self.order_id}, status={self.status})"


class ContentPage(models.Model):
    slug = models.SlugField(max_length=64, unique=True)
    title = models.CharField(max_length=160)
    body = models.TextField()
    hero_image = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self):
        return self.title


class Notification(models.Model):
    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        PUSH = "push", "Push"
        SMS = "sms", "SMS"

    class Type(models.TextChoices):
        ORDER_UPDATE = "order_update", "Order update"
        ABANDONED_CART = "abandoned_cart", "Abandoned cart"
        PROMOTION = "promotion", "Promotion"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=32, choices=Type.choices)
    channel = models.CharField(max_length=16, choices=Channel.choices, default=Channel.EMAIL)
    payload = models.JSONField(default=dict, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def mark_read(self):
        self.read_at = timezone.now()
        self.save(update_fields=["read_at"])
