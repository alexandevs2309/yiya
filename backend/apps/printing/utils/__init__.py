import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def create_payment_print_job(payment):
    if not getattr(settings, 'PRINT_ON_PAYMENT', True):
        return

    from apps.core.utils import get_business_config
    biz = get_business_config()

    order = payment.order
    items = _build_receipt_items(payment, order)

    data = {
        'restaurant': biz['business_name'],
        'rnc': biz['rnc'],
        'direccion': biz['address'],
        'ncf': '',
        'metodo_pago': payment.get_method_display(),
        'mesa': order.table.number if order.table else '',
        'mesero': order.waiter.get_full_name() or order.waiter.username,
        'fecha': payment.created_at.isoformat(),
        'items': items,
        'subtotal': float(payment.subtotal),
        'itbis': float(payment.itbis),
        'propina': float(payment.propina),
        'total': float(payment.total),
        'efectivo': float(payment.cash_received) if payment.cash_received else None,
        'cambio': float(payment.change_given) if payment.change_given else None,
    }

    ecf = payment.ecf_documents.first()
    if ecf:
        data['ncf'] = ecf.ncf or ''
        data['rnc_cliente'] = ecf.rnc_cliente or ''
        data['razon_social'] = ecf.razon_social_cliente or ''
        if ecf.needs_pending_ticket:
            data['pending_ecf'] = True
            data['ncf_display'] = 'Comprobante en proceso de validación DGII'
        else:
            data['ncf_display'] = ecf.ncf or ''

    from ..models import PrintJob, PrinterConfig
    printer = PrinterConfig.objects.filter(type='receipt', is_default=True, is_active=True).first()

    PrintJob.objects.create(
        type='receipt',
        data=data,
        printer=printer,
        payment=payment,
        order=order,
    )
    logger.info(f'PrintJob creado para pago {payment.id.hex[:8]}')


def _build_receipt_items(payment, order):
    items = []
    if payment.items_json:
        for i in payment.items_json:
            items.append({
                'cantidad': int(i['cantidad']),
                'nombre': i['nombre'],
                'precio': float(i['precio']),
                'total': float(i['precio'] * i['cantidad']),
                'modificadores': i.get('modificadores') or [],
            })
    else:
        for i in order.items.exclude(status='cancelled').all():
            items.append({
                'cantidad': i.quantity,
                'nombre': i.name,
                'precio': float(i.price),
                'total': float(i.price * i.quantity),
                'modificadores': [m['name'] for m in (i.modifiers_json or [])],
            })
    return items
