import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(os.path.join(Path(__file__).resolve().parent.parent.parent.parent, '.env'))

BASE_DIR = Path(__file__).resolve().parent.parent.parent

import sys
if str(BASE_DIR / 'apps') not in sys.path:
    sys.path.insert(0, str(BASE_DIR / 'apps'))

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'insecure-dev-key-change-in-production')
DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') + [
    '.trycloudflare.com',
    'django',
    '.railway.app',
    '.up.railway.app',
]
RAILWAY_ENVIRONMENT = os.getenv('RAILWAY_ENVIRONMENT')
if RAILWAY_ENVIRONMENT:
    import re
    RAILWAY_PUBLIC_DOMAIN = os.getenv('RAILWAY_PUBLIC_DOMAIN', '')
    if RAILWAY_PUBLIC_DOMAIN:
        ALLOWED_HOSTS.append(RAILWAY_PUBLIC_DOMAIN)
    ALLOWED_HOSTS = list(set(ALLOWED_HOSTS))

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'channels',
    # Local apps
    'apps.core',
    'apps.pos',
    'apps.billing',
    'apps.inventory',
    'apps.printing',
    'apps.cashregister',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB', 'dyiya_pos'),
        'USER': os.getenv('POSTGRES_USER', 'dyiya'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD', ''),
        'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
        'PORT': os.getenv('POSTGRES_PORT', '5432'),
    }
}
# Railway: usar DATABASE_URL si está presente
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    import dj_database_url
    DATABASES['default'] = dj_database_url.parse(DATABASE_URL, conn_max_age=600)

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

AUTH_USER_MODEL = 'core.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
]

LANGUAGE_CODE = 'es-do'
TIME_ZONE = 'America/Santo_Domingo'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'static'
# STATICFILES_DIRS = [BASE_DIR / 'staticfiles']

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

RESTAURANT_NAME = os.getenv('RESTAURANT_NAME', "D'Yiya Restaurant")
DGII_RNC = os.getenv('DGII_RNC', '000000000')
ALANUBE_API_KEY = os.getenv('ALANUBE_API_KEY', '')
ALANUBE_DEV_MODE = os.getenv('ALANUBE_DEV_MODE', 'True') == 'True'
ALANUBE_COMPANY_ID = os.getenv('ALANUBE_COMPANY_ID', '')
PRINT_BRIDGE_TOKEN = os.getenv('PRINT_BRIDGE_TOKEN', 'auron-bridge-dev-token')
PRINT_ON_PAYMENT = os.getenv('PRINT_ON_PAYMENT', 'True') == 'True'

USE_REAL_ECF = os.getenv('USE_REAL_ECF', 'False') == 'True'
ECF_ENGINE_URL = os.getenv('ECF_ENGINE_URL', 'http://localhost:8001')
ECF_ENGINE_USER = os.getenv('ECF_ENGINE_USER', 'dyiya-api')
ECF_ENGINE_PASSWORD = os.getenv('ECF_ENGINE_PASSWORD', '')
ECF_ENGINE_AMBIENTE = os.getenv('ECF_ENGINE_AMBIENTE', 'produccion')
ECF_ENGINE_TIMEOUT = int(os.getenv('ECF_ENGINE_TIMEOUT', '10'))
ECF_ENGINE_CERT_ID = int(os.getenv('ECF_ENGINE_CERT_ID', '1'))

SPECTACULAR_SETTINGS = {
    'TITLE': "D'Yiya POS API",
    'DESCRIPTION': 'API del sistema POS para restaurant D\'Yiya',
    'VERSION': '1.0.0',
}

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:8000',
    'http://localhost:8080',
]
# Railway: agregar dominios públicos dinámicamente
if RAILWAY_ENVIRONMENT:
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r'^https://.*\.railway\.app$',
        r'^https://.*\.up\.railway\.app$',
    ]
    rail_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN', '')
    if rail_domain:
        CORS_ALLOWED_ORIGINS.append(f'https://{rail_domain}')
    if DEBUG:
        CORS_ALLOW_ALL_ORIGINS = True

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
