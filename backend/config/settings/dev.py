# =============================================================================
# D'Yiya POS — Configuración de DESARROLLO LOCAL
# =============================================================================
# ATENCIÓN: Este archivo es SOLO para desarrollo local en máquina Linux/macOS.
# En la máquina de producción del cliente (Windows) se usa PostgreSQL nativo
# según la configuración en config/settings.py. La decisión de producción
# (PostgreSQL nativo en Windows, SIN Docker/Celery/Redis) está documentada
# en AGENTS.md y especificacion.md.
#
# ⚠️ NO uses este archivo en producción. ⚠️
# =============================================================================

from ..settings import *

# --- Base de datos: SQLite para desarrollo rápido ---
# PostgreSQL no está disponible en esta máquina de desarrollo.
# En producción se usará PostgreSQL nativo en Windows.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# --- Debug activado para desarrollo ---
DEBUG = True

# --- Daphne fuera de INSTALLED_APPS en desarrollo ---
# Usamos el runserver estándar de Django (no Daphne) para desarrollo rápido.
# Daphne se usa en producción con: daphne config.asgi:application
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'daphne']

# --- Channel Layer en memoria (sin Redis) ---
# En producción se usa InMemoryChannelLayer (sin Redis, sin Docker).
# Para desarrollo local es suficiente.
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# --- CORS permisivo para desarrollo ---
CORS_ALLOW_ALL_ORIGINS = True

# --- Paginación alta para desarrollo (evitar paginado en catálogos) ---
REST_FRAMEWORK = REST_FRAMEWORK.copy()
REST_FRAMEWORK['PAGE_SIZE'] = 200

# --- Logging más verboso para desarrollo ---
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
    },
}
