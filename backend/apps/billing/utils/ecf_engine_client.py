import logging
import requests
from decimal import Decimal
from apps.billing.models import ECFDocument, NCFSequence
from .ecf_engine_config import (
    ECF_ENGINE_URL, ECF_ENGINE_USER, ECF_ENGINE_PASSWORD,
    ECF_ENGINE_AMBIENTE, ECF_ENGINE_TIMEOUT, ECF_ENGINE_CERT_ID,
    NCF_TYPE_TO_TIPO,
)

logger = logging.getLogger(__name__)

CONSULTA_TIMEOUT = 5


class ECFEngineError(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f'ECF Engine {status_code}: {detail}')


def _login(session: requests.Session) -> str:
    resp = session.post(
        f'{ECF_ENGINE_URL}/api/auth/login/',
        json={'username': ECF_ENGINE_USER, 'password': ECF_ENGINE_PASSWORD},
        timeout=ECF_ENGINE_TIMEOUT,
    )
    if resp.status_code != 200:
        raise ECFEngineError(resp.status_code, resp.text)
    return resp.json()['access']


def _build_payload(doc: ECFDocument) -> dict:
    order = doc.payment.order
    payload = doc.json_payload or {}
    encabezado = payload.get('encabezado', {})
    detalles = payload.get('detalles', [])
    totales = payload.get('totales', {})

    items = []
    for i, d in enumerate(detalles, start=1):
        items.append({
            'lineNumber': i,
            'itemName': d.get('descripcion', ''),
            'quantityItem': float(d.get('cantidad', 1)),
            'unitMeasure': 0,
            'unitPriceItem': float(d.get('precio_unitario', 0)),
            'itemAmount': float(d.get('monto', 0)),
        })

    nc_type = NCF_TYPE_TO_TIPO.get(doc.ncf_type, 32)
    encf = encabezado.get('ncf', doc.ncf or '')
    rnc_comprador = encabezado.get('rnc_comprador', doc.rnc_cliente or '')
    razon_social = encabezado.get('razon_social_comprador', doc.razon_social_cliente or '')

    payload_body = {
        'tipo_documento': nc_type,
        'encf': encf,
        'certificado_id': ECF_ENGINE_CERT_ID,
        'fecha_emision': encabezado.get('fecha_emision', ''),
        'emisor': {
            'rnc': encabezado.get('rnc_emisor', ''),
            'companyName': encabezado.get('razon_social_emisor', ''),
        },
        'comprador': {
            'rnc': rnc_comprador,
            'companyName': razon_social,
        },
        'totales': {
            'totalTaxedAmount': float(totales.get('subtotal', 0)),
            'itbisTotal': float(totales.get('itbis', 0)),
            'totalAmount': float(totales.get('total', 0)),
        },
        'items': items,
    }

    if nc_type in (31, 32):
        payload_body['tipo_ingresos'] = 1
        payload_body['tipo_pago'] = 1
        if nc_type == 31:
            payload_body['fecha_vencimiento_secuencia'] = ''
    elif nc_type == 34:
        ncf_modificado = encabezado.get('ncf_modificado')
        if ncf_modificado:
            payload_body['informacion_referencia'] = {
                'ncf_modificado': ncf_modificado,
                'fecha_modificacion': encabezado.get('fecha_emision', ''),
                ' motivo': 'Nota de Crédito',
            }
        payload_body['indicador_nota_credito'] = 1

    return payload_body


def send_ecf(doc: ECFDocument) -> dict:
    session = requests.Session()
    token = _login(session)

    payload = _build_payload(doc)

    logger.info('Enviando e-CF %s (%s) a motor %s', doc.ncf, doc.ncf_type, ECF_ENGINE_URL)

    resp = session.post(
        f'{ECF_ENGINE_URL}/api/documentos/enviar-automatico/',
        json=payload,
        headers={'Authorization': f'Bearer {token}'},
        timeout=ECF_ENGINE_TIMEOUT,
    )

    if resp.status_code >= 500:
        raise ECFEngineError(resp.status_code, resp.text)

    body = resp.json()

    if resp.status_code not in (200, 201):
        error_detail = body.get('error', str(body))
        raise ECFEngineError(resp.status_code, error_detail)

    track_id = body.get('track_id', '')
    encf_motor = body.get('encf', '')
    estado = body.get('estado', '')

    logger.info('Motor respondió: track_id=%s encf=%s estado=%s', track_id, encf_motor, estado)

    return {
        'track_id': track_id,
        'encf': encf_motor,
        'estado': estado,
        'motor_token': token,
        'raw': body,
    }


def consultar_estado(doc_motor_id: int, motor_token: str) -> dict:
    session = requests.Session()
    resp = session.post(
        f'{ECF_ENGINE_URL}/api/documentos/{doc_motor_id}/consultar-estado/',
        json={},
        headers={'Authorization': f'Bearer {motor_token}'},
        timeout=CONSULTA_TIMEOUT,
    )
    if resp.status_code >= 500:
        raise ECFEngineError(resp.status_code, resp.text)
    body = resp.json()
    if resp.status_code not in (200, 201):
        error_detail = body.get('error', str(body))
        raise ECFEngineError(resp.status_code, error_detail)
    return {
        'estado': body.get('estado', ''),
        'track_id': body.get('track_id', ''),
        'encf': body.get('encf', ''),
        'dgii_response': body.get('dgii_response', {}),
    }
