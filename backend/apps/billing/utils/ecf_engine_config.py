import os
from django.conf import settings

ECF_ENGINE_URL = getattr(settings, 'ECF_ENGINE_URL', os.getenv('ECF_ENGINE_URL', 'http://localhost:8001'))
ECF_ENGINE_USER = getattr(settings, 'ECF_ENGINE_USER', os.getenv('ECF_ENGINE_USER', 'dyiya-api'))
ECF_ENGINE_PASSWORD = getattr(settings, 'ECF_ENGINE_PASSWORD', os.getenv('ECF_ENGINE_PASSWORD', ''))
ECF_ENGINE_AMBIENTE = getattr(settings, 'ECF_ENGINE_AMBIENTE', os.getenv('ECF_ENGINE_AMBIENTE', 'produccion'))
ECF_ENGINE_TIMEOUT = int(getattr(settings, 'ECF_ENGINE_TIMEOUT', os.getenv('ECF_ENGINE_TIMEOUT', '10')))
_cert_raw = getattr(settings, 'ECF_ENGINE_CERT_ID', os.getenv('ECF_ENGINE_CERT_ID', '1'))
try:
    ECF_ENGINE_CERT_ID = int(_cert_raw)
except (ValueError, TypeError):
    ECF_ENGINE_CERT_ID = 1

# Mapeo NCF D'Yiya → tipo documento motor.
# D'Yiya usa B01 para Factura de Consumo (tipo 32 en el motor).
# DGII real: B01=Crédito Fiscal(31), B02=Consumo(32). Aquí se mapea
# el prefijo D'Yiya al tipo motor, no el prefijo DGII estándar.
NCF_TYPE_TO_TIPO = {
    'B01': 32,  # D'Yiya: Factura de Consumo
    'B04': 34,  # Nota de Crédito
    'B14': 43,  # Gastos Menores
}
