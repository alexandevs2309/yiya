import os
from django.conf import settings

ECF_ENGINE_URL = getattr(settings, 'ECF_ENGINE_URL', os.getenv('ECF_ENGINE_URL', 'http://localhost:8001'))
ECF_ENGINE_USER = getattr(settings, 'ECF_ENGINE_USER', os.getenv('ECF_ENGINE_USER', 'dyiya-api'))
ECF_ENGINE_PASSWORD = getattr(settings, 'ECF_ENGINE_PASSWORD', os.getenv('ECF_ENGINE_PASSWORD', ''))
ECF_ENGINE_AMBIENTE = getattr(settings, 'ECF_ENGINE_AMBIENTE', os.getenv('ECF_ENGINE_AMBIENTE', 'produccion'))
ECF_ENGINE_TIMEOUT = int(getattr(settings, 'ECF_ENGINE_TIMEOUT', os.getenv('ECF_ENGINE_TIMEOUT', '10')))
ECF_ENGINE_CERT_ID = int(getattr(settings, 'ECF_ENGINE_CERT_ID', os.getenv('ECF_ENGINE_CERT_ID', '1')))

NCF_TYPE_TO_TIPO = {
    'B01': 32,
    'B04': 34,
    'B14': 43,
}
