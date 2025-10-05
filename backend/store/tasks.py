from __future__ import annotations

import math
import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Dict, Iterable

from celery import shared_task
from celery.utils.log import get_task_logger
from django.db import transaction
from django.utils import timezone

from .adapters.base import get_adapter_for_supplier
from .models import (
    Supplier,
    Product,
    Category,
    SupplierProduct,
    Inventory,
    Order,
    OrderItem,
    Notification,
    CouponRedemption,
    Payment as PaymentModel,
)
from .metrics import SUPPLIER_SYNC_FAILURES, PAYMENT_FAILURES
from .payments.base import get_gateway

log = get_task_logger(__name__)


def _apply_markup(supplier: Supplier, base_price: Decimal) -> Decimal:
    if supplier.markup_type == Supplier.MarkupType.FIXED:
        price = base_price + supplier.markup_value
    else:
        price = base_price * (Decimal("1.00") + supplier.markup_value / Decimal("100.00"))
    return price.quantize(Decimal("0.01"))


@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_backoff_max=600, retry_kwargs={"max_retries": 5})
def sync_supplier_products(supplier_id: int):
    supplier = Supplier.objects.get(id=supplier_id)
    adapter = get_adapter_for_supplier(supplier)
    page = 1
    total = 0
    while True:
        try:
            products, has_next = adapter.fetch_products(page=page)
        except Exception:
            SUPPLIER_SYNC_FAILURES.labels(supplier=supplier.name).inc()
            raise
        for p in products:
            sku = p.get("sku") or f"{supplier.id}-{p['id']}"
            title = p.get("title") or sku
            price = Decimal(str(p.get("price") or "0"))
            stock = int(p.get("stock") or 0)
            images = p.get("images") or []
            category_name = (p.get("category") or "General").strip() or "General"
            category, _ = Category.objects.get_or_create(name=category_name, defaults={"slug": category_name.lower().replace(" ", "-")})

            product, created = Product.objects.update_or_create(
                sku=sku,
                supplier=supplier,
                defaults={
                    "title": title,
                    "slug": title.lower().replace(" ", "-"),
                    "base_price": _apply_markup(supplier, price),
                    "category": category,
                    "active": True,
                },
            )
            SupplierProduct.objects.update_or_create(
                supplier=supplier,
                product=product,
                defaults={
                    "supplier_sku": sku,
                    "supplier_product_id": str(p.get("id")),
                    "sync_meta": {"images": images, "stock": stock},
                },
            )
            inv, _ = Inventory.objects.get_or_create(product=product, defaults={"quantity": max(0, stock)})
            inv.quantity = max(0, stock)
            inv.save(update_fields=["quantity"])
            total += 1
        if not has_next:
            break
        page += 1
    supplier.last_synced_at = timezone.now()
    supplier.save(update_fields=["last_synced_at"])
    log.info("Synced %s products for supplier %s", total, supplier.name)
    return total


@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def sync_supplier_order_statuses():
    orders = Order.objects.exclude(supplier_order_ids={}).exclude(status__in=[Order.Status.DELIVERED, Order.Status.REFUNDED, Order.Status.CANCELLED])
    updated = 0
    for order in orders:
        ids: Dict[str, str] = order.supplier_order_ids or {}
        for supplier_name, supplier_order_id in ids.items():
            try:
                supplier = Supplier.objects.filter(name__iexact=supplier_name).first()
                if not supplier:
                    continue
                adapter = get_adapter_for_supplier(supplier)
                status_info = adapter.get_order_status(supplier_order_id)
                # simplistic mapping
                if status_info.get("status") in ("shipped", "delivered"):
                    order.status = Order.Status.SHIPPED if status_info.get("status") == "shipped" else Order.Status.DELIVERED
                    order.save(update_fields=["status"])
                    updated += 1
            except Exception as exc:
                log.warning("Failed to sync order %s for supplier %s: %s", order.id, supplier_name, exc)
                SUPPLIER_SYNC_FAILURES.labels(supplier=supplier_name or "unknown").inc()
    return updated


@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def auto_forward_order_to_supplier(order_id: int):
    order = Order.objects.get(id=order_id)
    if order.status != Order.Status.PAID:
        return {"skipped": True}

    # group items by supplier
    by_supplier: Dict[Supplier, list] = {}
    for item in order.items.select_related("product__supplier"):
        supplier = item.product.supplier
        if not supplier:
            continue
        by_supplier.setdefault(supplier, []).append(item)

    ids = order.supplier_order_ids or {}
    for supplier, items in by_supplier.items():
        # idempotency: skip if already placed for this supplier
        if supplier.name in ids:
            continue
        payload = {
            "idempotency_key": f"{order.id}-{supplier.id}",
            "order_ref": order.id,
            "shipping_address_id": order.shipping_address_id,
            "items": [
                {
                    "sku": it.product.sku,
                    "quantity": it.quantity,
                    "unit_price": str(it.unit_price),
                }
                for it in items
            ],
        }
        adapter = get_adapter_for_supplier(supplier)
        res = adapter.place_order(payload)
        supplier_order_id = res.get("supplier_order_id")
        if supplier_order_id:
            ids[supplier.name] = supplier_order_id
    order.supplier_order_ids = ids
    order.save(update_fields=["supplier_order_ids"])
    return ids


@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def reconcile_payments():
    """Compare local payments with gateway-reported statuses and update mismatches."""
    mismatches = []
    qs = PaymentModel.objects.all()
    for p in qs:
        try:
            gw = get_gateway(p.provider)
            status = gw.fetch_payment_status(p.provider_payment_id)
            remote = (status.get("status") or "").lower()
            local = p.status
            if remote in ("succeeded", "paid") and local != PaymentModel.Status.SUCCEEDED:
                p.status = PaymentModel.Status.SUCCEEDED
                p.save(update_fields=["status"])
                if p.order.status != Order.Status.PAID:
                    p.order.status = Order.Status.PAID
                    p.order.payment_status = Order.PaymentStatus.PAID
                    p.order.save(update_fields=["status", "payment_status"])
                if p.order.coupon:
                    CouponRedemption.objects.get_or_create(order=p.order, coupon=p.order.coupon, user=p.order.user)
                mismatches.append(p.id)
        except NotImplementedError:
            continue
    return {"updated": mismatches}


@shared_task
def enqueue_order_notification(order_id: int, status: str, payload: Dict | None = None):
    order = Order.objects.select_related("user").filter(id=order_id).first()
    if not order:
        return {"created": False}
    data = {"order_id": order.id, "status": status}
    if payload:
        data.update(payload)
    notification = Notification.objects.create(
        user=order.user,
        notification_type=Notification.Type.ORDER_UPDATE,
        payload=data,
        sent_at=timezone.now(),
    )
    return {"notification_id": notification.id}


@shared_task
def send_abandoned_checkout_notifications():
    threshold = timezone.now() - timedelta(hours=24)
    pending_orders = (
        Order.objects.select_related("user")
        .filter(status=Order.Status.PENDING, placed_at__lte=threshold)
    )
    created = 0
    for order in pending_orders:
        exists = Notification.objects.filter(
            user=order.user,
            notification_type=Notification.Type.ABANDONED_CART,
            payload__order_id=order.id,
        ).exists()
        if exists:
            continue
        Notification.objects.create(
            user=order.user,
            notification_type=Notification.Type.ABANDONED_CART,
            payload={"order_id": order.id},
            sent_at=timezone.now(),
        )
        created += 1
    return {"notifications": created}
