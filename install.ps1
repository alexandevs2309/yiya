# D'Yiya POS — Instalación local en Windows
# Correr como Administrador: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"
$APP_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PYTHON = "python"
$NSSM = "$APP_DIR\nssm\win64\nssm.exe"

Write-Host "=== D'Yiya POS — Instalación ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Python
try {
    $ver = & $PYTHON --version
    Write-Host "[OK] Python: $ver" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python no encontrado. Instala Python 3.12 desde python.org" -ForegroundColor Red
    pause
    exit 1
}

# 2. Crear entorno virtual
$VENV = "$APP_DIR\venv"
if (-not (Test-Path "$VENV\Scripts\python.exe")) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Cyan
    & $PYTHON -m venv $VENV
}
$PYTHON = "$VENV\Scripts\python.exe"
Write-Host "[OK] Entorno virtual listo" -ForegroundColor Green

# 3. Instalar dependencias
Write-Host "Instalando dependencias..." -ForegroundColor Cyan
& $PYTHON -m pip install --upgrade pip -q
& $PYTHON -m pip install -r "$APP_DIR\backend\requirements.txt" -q
Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green

# 4. Crear .env si no existe
if (-not (Test-Path "$APP_DIR\.env")) {
    Copy-Item "$APP_DIR\.env.example" "$APP_DIR\.env"
    Write-Host "[!] .env creado. EDITA .env con credenciales reales." -ForegroundColor Yellow
    pause
} else {
    Write-Host "[OK] .env existe" -ForegroundColor Green
}

# 5. Migraciones
Write-Host "Ejecutando migraciones..." -ForegroundColor Cyan
& $PYTHON "$APP_DIR\backend\manage.py" migrate
Write-Host "[OK] Migraciones aplicadas" -ForegroundColor Green

# 6. Colectar archivos estáticos
Write-Host "Colectando estáticos..." -ForegroundColor Cyan
& $PYTHON "$APP_DIR\backend\manage.py" collectstatic --noinput
Write-Host "[OK] Estáticos colectados" -ForegroundColor Green

# 7. Crear superusuario
Write-Host "Creando superusuario admin..." -ForegroundColor Cyan
& $PYTHON "$APP_DIR\backend\manage.py" shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@dyiya.com', 'admin123', role='admin')
    print('Superusuario creado: admin / admin123')
else:
    print('Superusuario ya existe')
"

# 8. Instalar servicios Windows con NSSM
if (Test-Path $NSSM) {
    Write-Host "Instalando servicios Windows..." -ForegroundColor Cyan
    
    # Servicio Django (Daphne ASGI)
    & $NSSM install "DYIYA-Django" $PYTHON "args" "$APP_DIR\backend\manage.py runserver 0.0.0.0:8000 --noreload"
    & $NSSM set "DYIYA-Django" AppDirectory "$APP_DIR\backend"
    & $NSSM set "DYIYA-Django" Start "SERVICE_AUTO_START"
    & $NSSM set "DYIYA-Django" AppStdout "$APP_DIR\logs\django.log"
    & $NSSM set "DYIYA-Django" AppStderr "$APP_DIR\logs\django.err"
    
    # Servicio Worker interno
    & $NSSM install "DYIYA-Worker" $PYTHON "args" "$APP_DIR\backend\manage.py run_worker"
    & $NSSM set "DYIYA-Worker" AppDirectory "$APP_DIR\backend"
    & $NSSM set "DYIYA-Worker" Start "SERVICE_AUTO_START"
    & $NSSM set "DYIYA-Worker" AppStdout "$APP_DIR\logs\worker.log"
    & $NSSM set "DYIYA-Worker" AppStderr "$APP_DIR\logs\worker.err"
    
    # Iniciar servicios
    & $NSSM start "DYIYA-Django"
    & $NSSM start "DYIYA-Worker"
    
    Write-Host "[OK] Servicios Windows instalados e iniciados" -ForegroundColor Green
} else {
    Write-Host "[!] NSSM no encontrado en $NSSM" -ForegroundColor Yellow
    Write-Host "    Descárgalo desde: https://nssm.cc/download"
    Write-Host "    Coloca nssm.exe en $APP_DIR\nssm\win64\ y vuelve a correr este script."
    Write-Host ""
    Write-Host "    Mientras tanto, para correr el servidor manualmente:"
    Write-Host "    cd backend && python manage.py runserver 0.0.0.0:8000"
    pause
}

# 9. Atajo de escritorio
$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut("$env:USERPROFILE\Desktop\D'Yiya POS.url")
$shortcut.TargetPath = "http://localhost:8000"
$shortcut.Description = "D'Yiya POS - Sistema de gestión"
$shortcut.Save()

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  INSTALACIÓN COMPLETA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Abre el sistema: http://localhost:8000" -ForegroundColor White
Write-Host "  Usuario: admin / Contraseña: admin123" -ForegroundColor Yellow
Write-Host ""
pause
