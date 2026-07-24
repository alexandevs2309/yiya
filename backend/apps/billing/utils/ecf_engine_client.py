"""
Cliente HTTP para el motor auron-ecf-engine.

Expone las funciones:
  - send_ecf(doc)           → envía un ECFDocument al motor (build+sign+send)
  - consultar_estado(...)   → consulta el estado de un documento en el motor

El motor expone POST /api/documentos/enviar-automatico/ que ejecuta
build → firmar → enviar a DGII en un solo request. El token de DGII
se obtiene automáticamente del .p12 del tenant.
"""
import logging
import requests
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from django.conf import settings
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
    """Obtiene un JWT del motor via /api/auth/login/."""
    resp = session.post(
        f'{ECF_ENGINE_URL}/api/auth/login/',
        json={'username': ECF_ENGINE_USER, 'password': ECF_ENGINE_PASSWORD},
        timeout=ECF_ENGINE_TIMEOUT,
    )
    if resp.status_code != 200:
        raise ECFEngineError(resp.status_code, resp.text)
    return resp.json()['access']


def _get_emisor_data() -> dict:
    """Obtiene los datos del emisor desde BusinessConfig."""
    try:
        from apps.core.utils import get_business_config
        biz = get_business_config()
    except Exception:
        biz = {}

    rnc = biz.get('rnc', '') or getattr(settings, 'DGII_RNC', '')
    nombre = biz.get('business_name', '') or getattr(settings, 'RESTAURANT_NAME', '')
    direccion = biz.get('address', '')
    municipio = biz.get('municipio', '') or None
    provincia = biz.get('provincia', '') or None

    return {
        'rnc_emisor': str(rnc),
        'razon_social_emisor': str(nombre),
        'direccion_emisor': str(direccion),
        'municipio': municipio,
        'provincia': provincia,
    }


def _format_date_ddmmyyyy(dt_or_str) -> str:
    """Convierte una fecha ISO o datetime a formato DD-MM-YYYY para el motor."""
    if isinstance(dt_or_str, datetime):
        return dt_or_str.strftime('%d-%m-%Y')
    if isinstance(dt_or_str, str):
        try:
            dt = datetime.fromisoformat(dt_or_str.replace('Z', '+00:00'))
            return dt.strftime('%d-%m-%Y')
        except (ValueError, TypeError):
            pass
    return datetime.now().strftime('%d-%m-%Y')


def _build_payload(doc) -> dict:
    """Construye el payload para POST /api/documentos/enviar-automatico/.

    Los campos siguen exactamente el contrato de EnviarAutomaticoSerializer
    del motor (snake_case, no camelCase).

    TODO: Tipo de pago mixto — hoy se mapea a tipo_pago=1 (efectivo) aunque
    el pago sea tarjeta o mixto. Revisar mapeo completo de formas de pago.
    """
    order = doc.payment.order
    payload = doc.json_payload or {}
    encabezado = payload.get('encabezado', {})
    detalles = payload.get('detalles', [])
    totales = payload.get('totales', {})

    # ── Items ──
    items = []
    for i, d in enumerate(detalles, start=1):
        items.append({
            'numero_linea': i,
            'indicador_facturacion': 1,  # 1=Gravado
            'nombre_item': d.get('descripcion', ''),
            'indicador_bien_o_servicio': 2,  # 2=Servicio (restaurante)
            'cantidad_item': str(d.get('cantidad', 1)),
            'precio_unitario_item': str(d.get('precio_unitario', 0)),
            'monto_item': str(d.get('monto', 0)),
        })

    # ── Totales ──
    subtotal = float(totales.get('subtotal', 0))
    itbis = float(totales.get('itbis', 0))
    total = float(totales.get('total', 0))

    totales_body = {
        'monto_total': str(total),
        'monto_gravado_total': str(subtotal),
        'total_itbis': str(itbis),
        'valor_pagar': str(total),
    }

    # ── Emisor ──
    emisor = _get_emisor_data()
    emisor['fecha_emision'] = _format_date_ddmmyyyy(
        encabezado.get('fecha_emision', datetime.now().isoformat())
    )

    # ── Comprador (opcional para tipo 32) ──
    rnc_comprador = encabezado.get('rnc_comprador', '') or ''
    razon_social = encabezado.get('razon_social_comprador', '') or ''
    comprador = None
    if rnc_comprador and rnc_comprador != '000000000':
        comprador = {
            'rnc_comprador': rnc_comprador,
            'razon_social_comprador': razon_social or 'Consumidor Final',
        }

    # ── Tipo de documento ──
    nc_type = NCF_TYPE_TO_TIPO.get(doc.ncf_type, 32)
    encf = encabezado.get('ncf', doc.ncf or '')

    payload_body = {
        'tipo_documento': nc_type,
        'certificado_id': ECF_ENGINE_CERT_ID,
        'encf': encf,
        'fecha_emision': _format_date_ddmmyyyy(
            encabezado.get('fecha_emision', datetime.now().isoformat())
        ),
        'emisor': emisor,
        'totales': totales_body,
        'items': items,
    }

    # ── Comprador si aplica ──
    if comprador:
        payload_body['comprador'] = comprador

    # ── Campos específicos por tipo ──
    if nc_type in (31, 32):
        payload_body['tipo_ingresos'] = encabezado.get('tipo_ingresos', '01')
        payload_body['tipo_pago'] = encabezado.get('tipo_pago', 1)
        if nc_type == 31:
            payload_body['fecha_vencimiento_secuencia'] = _format_date_ddmmyyyy(
                datetime.now() + timedelta(days=365)
            )
    elif nc_type == 34:
        ncf_modificado = encabezado.get('ncf_modificado')
        if ncf_modificado:
            payload_body['informacion_referencia'] = {
                'ncf_modificado': ncf_modificado,
                'fecha_ncf_modificado': _format_date_ddmmyyyy(
                    encabezado.get('fecha_emision', datetime.now().isoformat())
                ),
                'codigo_modificacion': 1,  # 1=Anula
                'razon_modificacion': 'Nota de Crédito',
            }
        payload_body['indicador_nota_credito'] = encabezado.get(
            'indicador_nota_credito', 1
        )

    return payload_body


def send_ecf(doc) -> dict:
    """Envía un ECFDocument al motor para build+sign+send.

    Retorna: {track_id, encf, estado, motor_token, raw}
    """
    session = requests.Session()
    token = _login(session)

    payload = _build_payload(doc)

    logger.info(
        'Enviando e-CF %s (tipo %s) a motor %s',
        doc.ncf or '(auto-ncf)', doc.ncf_type, ECF_ENGINE_URL,
    )

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

    logger.info(
        'Motor respondió: track_id=%s encf=%s estado=%s',
        track_id, encf_motor, estado,
    )

    return {
        'track_id': track_id,
        'encf': encf_motor,
        'estado': estado,
        'motor_token': token,
        'raw': body,
    }


def consultar_estado(doc_motor_id: int, motor_token: str) -> dict:
    """Consulta el estado de un documento en el motor.

    Timeout corto (5s) — si no responde, el caller debe marcar
    needs_pending_ticket=True.
    """
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
