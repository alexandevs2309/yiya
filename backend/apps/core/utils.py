from django.conf import settings


def get_business_config():
    """
    Retorna la configuración de la empresa desde BusinessConfig.
    Fallback a settings (env vars) si no existe en BD.
    """
    try:
        from .models import BusinessConfig
        config = BusinessConfig.get_instance()
        return {
            'business_name': config.business_name,
            'rnc': config.rnc,
            'address': config.address,
            'phone': config.phone,
            'email': config.email,
            'logo': config.logo.url if config.logo else None,
        }
    except Exception:
        return {
            'business_name': getattr(settings, 'RESTAURANT_NAME', "D'Yiya Restaurant"),
            'rnc': getattr(settings, 'DGII_RNC', '000000000'),
            'address': 'Samaná, República Dominicana',
            'phone': '',
            'email': '',
            'logo': None,
        }
