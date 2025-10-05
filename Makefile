SHELL := /bin/bash

.PHONY: dev migrate makemigrations superuser seed test backend-shell frontend-dev

dev:
	docker-compose up --build

migrate:
	docker-compose run --rm backend python manage.py migrate

makemigrations:
	docker-compose run --rm backend python manage.py makemigrations

superuser:
	docker-compose run --rm backend python manage.py createsuperuser

seed:
	docker-compose run --rm backend python manage.py seed

test:
	cd backend && pytest -q && cd ../frontend && npm ci && npm run test -s

test-frontend:
	cd frontend && npm ci && npm run test -s

test-e2e:
	cd frontend && npm ci && npm run build && npm run e2e -s

test-all:
	$(MAKE) test && $(MAKE) test-frontend

backend-shell:
	docker-compose run --rm backend python manage.py shell

frontend-dev:
	cd frontend && npm run dev
