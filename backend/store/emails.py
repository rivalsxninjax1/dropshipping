import logging
from decimal import Decimal
from typing import Iterable

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Order

logger = logging.getLogger(__name__)


def _format_order_lines(order: Order) -> Iterable[str]:
    yield f"Order ID: {order.id}"
    yield f"Placed at: {timezone.localtime(order.placed_at).strftime('%Y-%m-%d %H:%M:%S %Z') if order.placed_at else timezone.localtime().strftime('%Y-%m-%d %H:%M:%S %Z')}"
    customer = order.user.get_full_name() or order.user.email
    yield f"Customer: {customer}"
    if order.user.phone:
        yield f"Phone: {order.user.phone}"
    yield f"Status: {order.status.title()}"
    yield f"Payment status: {order.payment_status.title()}"
    yield ""
    yield "Items:"
    for item in order.items.select_related("product"):
        product = item.product
        line_total = item.line_total()
        yield f" - {product.title} (SKU {product.sku}) x{item.quantity} — {line_total}"
    yield ""
    discount = order.discount_amount or Decimal("0.00")
    subtotal = (order.total_amount + discount).quantize(Decimal("0.01"))
    yield f"Subtotal: {subtotal}"
    if discount:
        yield f"Discount: -{discount.quantize(Decimal('0.01'))}"
    yield f"Order total: {order.total_amount}"
    yield ""
    yield f"Shipping method: {order.shipping_method or 'Standard'}"
    if order.shipping_address:
        addr = order.shipping_address
        yield "Ship to:"
        yield f" {addr.address_line1}"
        yield f" {addr.city}, {addr.state} {addr.postal_code}"
        yield f" {addr.country}"


def send_order_notification(order: Order) -> None:
    """Email the store owner when a new order is created."""
    recipient = getattr(settings, "ORDER_NOTIFICATION_EMAIL", None)
    if not recipient:
        return

    subject = f"New order #{order.id} — {order.total_amount}"
    message = "\n".join(list(_format_order_lines(order)))

    try:
        # Import the Gmail API utility
        from .gmail_api import send_email_via_gmail
        
        # Try sending via Gmail API first
        success = send_email_via_gmail(
            to=recipient,
            subject=subject,
            body=message
        )
        
        # Fall back to Django's send_mail if Gmail API fails
        if not success:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[recipient],
                fail_silently=False,
            )
            
        logger.info(f"Order notification sent for order {order.id} to {recipient}")
    except Exception:
        logger.exception("Failed to send order notification for order %s", order.id)
