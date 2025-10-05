# Production Setup Notes

- Web stack
  - Backend: Django + Gunicorn behind Nginx or provider load balancer.
  - Frontend: built static assets served by Nginx or a CDN.
  - Celery + Redis for async tasks; Postgres for DB.

- HTTPS
  - Use Let's Encrypt via your ingress (e.g., Nginx + certbot, or provider-managed TLS).

- Static/Media
  - Serve static via CDN (CloudFront/Cloudflare). Media on S3/Spaces using `django-storages` and `AWS_*` env.

- DB
  - Use managed Postgres with automated backups; enable read replicas if needed.

- Secrets
  - Inject environment variables via provider secrets (Render, DO, AWS Secrets Manager). Do not commit secrets.

- Health/Probes
  - Backend readiness/liveness: `GET /api/health/` returns `{ "status": "ok" }`.
  - Add container `HEALTHCHECK` (already in Dockerfiles) and map to orchestrator probes.

- Deploy
  - Build images using GitHub Actions `cd.yml`. Push to registry (GHCR/DOCR/ECR) via repo secrets.
  - Roll out new images to your platform and run migrations on release.

- Observability
  - Enable access and error logs on Nginx. Add app monitoring (Sentry, OpenTelemetry) and metrics (Prometheus) as needed.

