from decimal import Decimal


def get_tax_rates():
    """
    Retorna los porcentajes actuales de ITBIS y Propina Legal desde TaxConfig.
    Fallback seguro: ITBIS 18%, Propina 10%.
    """
    try:
        from apps.core.models import TaxConfig
        config = TaxConfig.get_instance()
        return {
            'itbis_rate': config.itbis_rate / Decimal('100'),
            'tip_rate': config.tip_rate / Decimal('100'),
            'enable_tip': config.enable_tip,
        }
    except Exception:
        return {
            'itbis_rate': Decimal('0.18'),
            'tip_rate': Decimal('0.10'),
            'enable_tip': True,
        }
