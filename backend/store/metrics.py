from prometheus_client import Counter

SUPPLIER_SYNC_FAILURES = Counter(
    "supplier_sync_failures_total",
    "Count of supplier sync failures",
    labelnames=("supplier",),
)

PAYMENT_FAILURES = Counter(
    "payment_failures_total",
    "Count of payment webhook failures",
    labelnames=("provider",),
)

