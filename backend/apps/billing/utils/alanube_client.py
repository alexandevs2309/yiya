import logging
import requests
from datetime import datetime
from django.conf import settings
from alanube.do import Alanube, AlanubeAPI

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 30

NCF_TYPE_TO_ENCF = {
    'B01': 32,
    'B04': 34,
    'B14': 43,
}


def _connect():
    if not settings.ALANUBE_API_KEY:
        raise ValueError('ALANUBE_API_KEY no está configurada')
    Alanube.connect(settings.ALANUBE_API_KEY, developer_mode=settings.ALANUBE_DEV_MODE)


def _build_dgii_payload(doc) -> dict:
    payload = doc.json_payload or {}
    encabezado = payload.get('encabezado', {})
    detalles = payload.get('detalles', [])
    totales = payload.get('totales', {})

    company_id = settings.ALANUBE_COMPANY_ID or ''
    dgii_rnc = settings.DGII_RNC
    restaurant_name = settings.RESTAURANT_NAME

    now = datetime.now()

    item_details = []
    for i, d in enumerate(detalles, start=1):
        unit_price = float(d.get('precio_unitario', 0))
        quantity = float(d.get('cantidad', 1))
        item_amount = float(d.get('monto', unit_price * quantity))
        item_details.append({
            'lineNumber': i,
            'itemName': d.get('descripcion', ''),
            'quantityItem': quantity,
            'unitMeasure': 0,
            'unitPriceItem': unit_price,
            'itemAmount': item_amount,
        })

    dgii_payload = {
        'idDoc': {
            'encf': doc.ncf or encabezado.get('ncf', ''),
            'incomeType': 1,
            'paymentType': 1,
            'paymentDeadline': now.strftime('%Y-%m-%d'),
            'paymentTerm': 'Único',
        },
        'sender': {
            'rnc': dgii_rnc,
            'companyName': restaurant_name,
            'address': '',
            'municipality': '',
            'province': '',
        },
        'buyer': {
            'rnc': doc.rnc_cliente or encabezado.get('rnc_comprador', '000000000'),
            'companyName': doc.razon_social_cliente or encabezado.get('razon_social_comprador', 'Consumidor Final'),
        },
        'totals': {
            'totalTaxedAmount': float(totales.get('subtotal', 0)),
            'itbisTotal': float(totales.get('itbis', 0)),
            'totalAmount': float(totales.get('total', 0)),
        },
        'itemDetails': item_details,
    }

    if company_id:
        dgii_payload['company'] = {'id': company_id}

    return dgii_payload


def check_document_exists(doc) -> bool:
    _connect()
    encf_type = NCF_TYPE_TO_ENCF.get(doc.ncf_type)
    if not encf_type:
        return False
    try:
        result = Alanube.get_documents(encf_type, document_number=doc.ncf)
        results = result.get('results', [])
        return any(r.get('encf') == doc.ncf for r in results)
    except Exception:
        return False


ENDPOINTS = {32: 'invoices', 34: 'credit-notes', 43: 'minor-expenses'}


def send_ecf(doc) -> dict:
    _connect()

    payload = _build_dgii_payload(doc)
    encf_type = NCF_TYPE_TO_ENCF.get(doc.ncf_type, 32)
    endpoint = ENDPOINTS.get(encf_type, 'invoices')
    url = f'{AlanubeAPI.config.api_url}/{endpoint}'
    headers = AlanubeAPI.get_headers()

    logger.info(f'Enviando e-CF {doc.ncf} ({doc.ncf_type}) a {url}')

    resp = requests.post(url, json=payload, headers=headers, timeout=REQUEST_TIMEOUT)

    if resp.status_code >= 500:
        resp.raise_for_status()

    if resp.status_code == 201:
        return resp.json()

    try:
        body = resp.json()
    except ValueError:
        body = resp.text

    error_detail = body.get('errors', body.get('error', str(body))) if isinstance(body, dict) else str(body)
    raise RuntimeError(f'Alanube respondió {resp.status_code}: {error_detail}')
