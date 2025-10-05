# Runbook: Monitoring and Operations

## Payment Webhooks Fail

Checklist:
- Check Sentry for recent errors related to `PaymentsWebhookView`.
- Inspect logs for payloads and provider status (search by `provider_payment_id`).
- Verify gateway status dashboard.
- Re-deliver webhook from provider dashboard if supported.
- Manually mark payment as succeeded only if funds are verified; otherwise, refund.
- Create a support ticket with the provider if repeated failures occur.

Remediation:
- If errors due to validation, fix signature/credential issues and deploy.
- If transient, retry delivery; monitor `payment_failures_total` metric.

## Re-sync Suppliers and Re-run Failed Orders

- Trigger supplier sync from Django Admin: Suppliers -> select -> Actions -> "Trigger product sync".
- Monitor `supplier_sync_failures_total` metric and Celery logs.
- For paid orders stuck in processing, run the Celery task to forward orders:
  - In Django shell: `from store.tasks import auto_forward_order_to_supplier; auto_forward_order_to_supplier.delay(<order_id>)`

## Rollback Deploy

- Re-deploy previous stable image tag in your platform.
- Run DB rollback only if schema-breaking changes were applied:
  - `python manage.py migrate <app> <previous_migration>`
  - Restore from backups as last resort.
- Verify health: `/api/health/` and Prometheus `/metrics`.
- Run smoke tests (checkout flow and admin product CRUD).

## Restore DB from Backup

- Identify backup snapshot and maintenance window.
- Restore snapshot to a new instance; point app to the restored DB.
- Run migrations forward/backward as required.
- Verify data integrity and mark incident timeline.

## Alerts

- Prometheus alert rules in `docs/ALERTS.prom.yml` for 5xx spikes, payment webhook failures, supplier sync failures, and Celery backlog.
- Route alerts to your paging system (PagerDuty/Opsgenie) with severity labels.

## Dashboards

- Grafana panels to include:
  - Request rate/latency by endpoint.
  - Error rate by status code.
  - Celery task duration and queue length.
  - Supplier sync failure count.
  - Payment failures by provider.

