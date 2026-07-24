#!/bin/bash
set -e

cleanup() {
    kill $DAPHNE_PID $VITE_PID 2>/dev/null
    wait $DAPHNE_PID $VITE_PID 2>/dev/null
}
trap cleanup SIGTERM SIGINT

cd /app/backend
python manage.py migrate --noinput

daphne -b 0.0.0.0 -p 8000 config.asgi:application &
DAPHNE_PID=$!

cd /app/frontend
npm run dev -- --host 0.0.0.0 &
VITE_PID=$!

wait $DAPHNE_PID $VITE_PID
