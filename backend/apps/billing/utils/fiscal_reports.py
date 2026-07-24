import csv
import io
import logging
from decimal import Decimal
from datetime import date, datetime

from django.http import HttpResponse

from apps.billing.models import Payment, ECFDocument

logger = logging.getLogger(__name__)


def generate_607_report(year: int, month: int) -> HttpResponse:
    """
    Genera el libro de ventas (Reporte 607) en formato CSV.
    Columnas según especificación DGII.
    """
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)

    ecf_docs = ECFDocument.objects.filter(
        ncf_type='B01',
        status='accepted',
        created_at__gte=start_date,
        created_at__lt=end_date,
    ).select_related('payment')

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        'RNC Comprador',
        'Razón Social Comprador',
        'NCF',
        'Fecha Emisión',
        'Fecha de Pago',
        'Monto Facturado',
        'ITBIS Facturado',
        'Propina Legal',
        'Total',
        'Forma de Pago',
        'Tipo de Documento',
    ])

    for doc in ecf_docs:
        payment = doc.payment
        if not payment:
            continue

        writer.writerow([
            doc.rnc_cliente or '000000000',
            doc.razon_social_cliente or 'Consumidor Final',
            doc.ncf or '',
            doc.created_at.strftime('%d/%m/%Y') if doc.created_at else '',
            payment.created_at.strftime('%d/%m/%Y') if payment.created_at else '',
            f'{payment.subtotal:.2f}',
            f'{payment.itbis:.2f}',
            f'{payment.propina:.2f}',
            f'{payment.total:.2f}',
            payment.get_method_display(),
            'B01',
        ])

    response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="607-ventas-{year}-{month:02d}.csv"'
    return response


def generate_606_report(year: int, month: int) -> HttpResponse:
    """
    Genera el libro de compras (Reporte 606) en formato CSV.
    """
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)

    ecf_docs = ECFDocument.objects.filter(
        ncf_type='B04',
        status='accepted',
        created_at__gte=start_date,
        created_at__lt=end_date,
    ).select_related('payment')

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        'RNC Proveedor',
        'Razón Social',
        'NCF',
        'Tipo',
        'Fecha',
        'Monto',
        'ITBIS',
        'Total',
    ])

    for doc in ecf_docs:
        payment = doc.payment
        writer.writerow([
            doc.rnc_cliente or '',
            doc.razon_social_cliente or '',
            doc.ncf or '',
            doc.ncf_type or 'B04',
            doc.created_at.strftime('%d/%m/%Y') if doc.created_at else '',
            f'{payment.subtotal:.2f}' if payment else '0.00',
            f'{payment.itbis:.2f}' if payment else '0.00',
            f'{payment.total:.2f}' if payment else '0.00',
        ])

    response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="606-compras-{year}-{month:02d}.csv"'
    return response
