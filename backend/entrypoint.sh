#!/usr/bin/env sh
set -e
echo "Running database migrations..."
python manage.py migrate --noinput
exec "$@"

