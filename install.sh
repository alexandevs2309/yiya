#!/usr/bin/env bash
# D'Yiya POS — Instalación local (Linux)
# Correr: chmod +x install.sh && ./install.sh

set -euo pipefail

echo "=== D'Yiya POS — Instalación ==="
echo ""

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker no está instalado."
    echo "Instálalo: https://docs.docker.com/engine/install/"
    exit 1
fi
echo "[OK] Docker encontrado"

# 2. Verificar Docker daemon
if ! docker info &> /dev/null; then
    echo "[ERROR] Docker daemon no está corriendo."
    exit 1
fi
echo "[OK] Docker daemon está corriendo"

# 3. Crear .env si no existe
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[!] Archivo .env creado desde .env.example"
    echo "    EDITA .env con las credenciales reales antes de continuar."
    read -p "    Presiona Enter cuando hayas terminado..."
else
    echo "[OK] .env ya existe"
fi

# 4. Build e iniciar
echo "Construyendo e iniciando servicios..."
docker compose up -d --build

# 5. Migraciones
echo "Ejecutando migraciones..."
docker compose exec django python manage.py migrate

# 6. Superusuario
echo "Creando superusuario admin..."
docker compose exec django python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@dyiya.com', 'admin123', role='admin')
    print('Superusuario creado: admin / admin123')
else:
    print('Superusuario ya existe')
"

echo ""
echo "========================================"
echo "  INSTALACIÓN COMPLETA"
echo "========================================"
echo ""
echo "  Abre: http://localhost:8000"
echo "  Usuario: admin / Contraseña: admin123"
echo ""
echo "  Para ver logs: docker compose logs -f"
echo "  Para detener:  docker compose down"
echo ""
