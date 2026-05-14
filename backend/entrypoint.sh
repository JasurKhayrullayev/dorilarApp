#!/bin/sh
set -e
python manage.py migrate --noinput
python manage.py collectstatic --noinput
if [ "${SEED_DEMO:-0}" = "1" ]; then
  python manage.py seed_demo || true
fi
exec gunicorn bad_crm.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
