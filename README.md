# Dropshipper Monorepo

Dev, Test, and Prod-ready monorepo with Django + DRF + Celery and Vite + React + TS.

## Quick Start (Dev)

1) Copy env and adjust:

   cp .env.example .env

2) Start stack (backend, db, redis, celery, frontend dev):

   make dev

3) Migrate DB and create superuser:

   make migrate
   make superuser

4) Seed sample data (users, categories, suppliers, products, orders):

   make seed

URLs:
- Backend: http://localhost:8000 (Docs: http://localhost:8000/api/docs/)
- Frontend: http://localhost:5173

## Tests

- Backend + Frontend unit tests:

  make test

- Frontend e2e (Playwright):

  cd frontend && npm run e2e:install && npm run e2e

CI runs backend, frontend, and e2e tests on PRs (see .github/workflows/ci.yml).

## API Verification

- Products: `curl http://localhost:8000/api/products/`
- JWT: `POST /api/token/` with `{ "username": "<email>", "password": "..." }`
- Orders (auth): `GET /api/orders/` with `Authorization: Bearer <access>`
- Wishlist: `GET /api/wishlist/`
- Coupon validation: `POST /api/coupons/validate/` with `{ "code": "...", "order_total": "100.00" }`
- Notifications: `GET /api/notifications/`

## Checkout & Payments

- Checkout: `POST /api/checkout/` with `{ shipping_address, billing_address, provider, coupon_code? }`
- Supported providers: Stripe, PayPal, eSewa, Khalti (configure via env keys `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_ID`, etc.).
- Webhook simulate: `POST /api/payments/webhook/` with `{ provider, order_id, provider_payment_id, status: 'success' }`
- On success, order/payment statuses transition to `paid`, coupon redemptions are recorded, and supplier auto-forward is triggered.

## Supplier Sync

- Trigger from Admin -> Suppliers -> Actions -> "Trigger product sync".
- Or via Celery task: `docker-compose exec backend celery -A backend worker -l info` (compose dev starts worker and beat).

## Production

- Build images with CD workflow (.github/workflows/cd.yml) and push to registry via secrets.
- Use `docker-compose.prod.yml` for local prod-like run (Nginx-serving frontend, Gunicorn backend).
- HTTPS: Put Nginx or your provider ingress with Let's Encrypt.
- Media: Use S3/Spaces with env vars in `.env`.
- Secrets: Use provider secrets (Render/DO/AWS Secrets Manager). Do not commit secrets.
- Monitoring: Sentry + Prometheus exposed at `/metrics`. Alert rules in `docs/ALERTS.prom.yml`.
- Logging: JSON structured logs to stdout (compatible with ELK/Datadog).

More details:
- docs/PRODUCTION.md — deploy and ops notes
- docs/RUNBOOK.md — incident response runbook
