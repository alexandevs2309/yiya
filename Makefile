# POS Restaurante Samaná — Makefile

.PHONY: help dev migrate shell superuser test build up down logs

help:
	@echo "POS Samaná — Comandos disponibles"
	@echo ""
	@echo "  make dev         Inicia backend + frontend en desarrollo"
	@echo "  make migrate     Ejecuta migraciones de Django"
	@echo "  make shell       Abre el shell de Django"
	@echo "  make superuser   Crea un superusuario"
	@echo "  make test        Ejecuta tests"
	@echo "  make build       Construye imágenes Docker"
	@echo "  make up          Inicia todos los servicios con Docker"
	@echo "  make down        Detiene servicios Docker"
	@echo "  make logs        Muestra logs de Docker"

# --- Desarrollo local ---

dev:
	@echo "Iniciando backend en :8000 y frontend en :5173..."
	cd backend && poetry run python manage.py runserver 0.0.0.0:8000 &
	cd frontend && npm run dev &
	wait

migrate:
	cd backend && poetry run python manage.py migrate

shell:
	cd backend && poetry run python manage.py shell

superuser:
	cd backend && poetry run python manage.py createsuperuser

test:
	cd backend && poetry run python manage.py test

# --- Docker ---

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f
