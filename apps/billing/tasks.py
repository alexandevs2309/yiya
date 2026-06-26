import time
import random
import requests
from celery import shared_task
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@shared_task(bind=True, max_retries=5)
def submit_ecf(self, ecf_id):
    """Envía un ECF a la DGII vía Alanube/ef2 con reintentos y tiempo real"""
    from .models import ECFDocument, ECFStatus
    
    try:
        doc = ECFDocument.objects.select_related("order").get(id=ecf_id)
    except ECFDocument.DoesNotExist:
        return {"error": "ECF no encontrado"}
        
    doc.retries += 1
    doc.save(update_fields=["retries"])
    
    # 1. Prepare payload
    order = doc.order
    items_data = []
    for item in order.items.all():
        items_data.append({
            "name": item.name,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "total_price": float(item.total_price),
            "itbis_rate": 0.18, # 18% ITBIS
        })
        
    payload = {
        "ecf_type": doc.ecf_type,
        "rnc": doc.rnc,
        "receipt_number": doc.provisional_number,
        "subtotal": float(order.subtotal or 0),
        "itbis": float(order.itbis or 0),
        "total": float(order.total or 0),
        "items": items_data,
    }
    
    # 2. Check if we should use Alanube BaaS
    provider = getattr(settings, "ECF_PROVIDER", "alanube")
    api_key = getattr(settings, "ECF_API_KEY", "")
    
    if api_key:
        try:
            url = "https://api.alanube.co/v1/ecf" if provider == "alanube" else "https://api.ef2.com.do/v1/ecf"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            res = requests.post(url, json=payload, headers=headers, timeout=15)
            doc.response_raw = res.json()
            
            if res.status_code in [200, 201]:
                res_data = res.json()
                doc.status = ECFStatus.APPROVED
                doc.ecf_number = res_data.get("ecf_number") or res_data.get("ncf") or f"E{doc.ecf_type}000000001"
                doc.pdf_url = res_data.get("pdf_url") or "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                doc.qr_code = res_data.get("qr_code") or ""
            else:
                doc.status = ECFStatus.REJECTED
        except Exception as exc:
            doc.status = ECFStatus.FAILED
            doc.save()
            raise self.retry(exc=exc, countdown=2 ** self.request.retries * 5)
    else:
        # Simulated DGII approval for Development Sandbox
        time.sleep(3.5) # Simulate processing time/signing XML
        
        # Generate NCF: E31 for Credit, E32 for Consumer
        serial = "".join([str(random.randint(0, 9)) for _ in range(7)])
        ecf_number = f"E{doc.ecf_type}000{serial}"
        
        doc.status = ECFStatus.APPROVED
        doc.ecf_number = ecf_number
        doc.pdf_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        doc.qr_code = f"https://dgii.gov.do/consulta_ecf?rnc=132711019&encf={ecf_number}"
        doc.response_raw = {
            "status": "APPROVED",
            "message": "Simulated DGII electronic signature valid.",
            "dgii_response": "Aprobado",
            "encf": ecf_number,
        }
        
    doc.save()
    
    if doc.status == ECFStatus.APPROVED and doc.order.whatsapp:
        send_whatsapp_ecf.delay(doc.id)
    
    # 3. Broadcast WebSocket notification to waitress/client
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"waitress_{order.waitress_id}",
            {
                "type": "ecf_approved",
                "data": {
                    "type": "ecf_approved",
                    "orderId": str(order.id),
                    "ecfNumber": doc.ecf_number,
                    "pdfUrl": doc.pdf_url,
                    "status": doc.status,
                }
            }
        )
    except Exception as ws_err:
        print(f"[e-CF] WebSocket notification failed: {ws_err}")
    return {"status": doc.status, "ecf_id": str(ecf_id), "ecf_number": doc.ecf_number}

@shared_task(bind=True, max_retries=3)
def send_whatsapp_ecf(self, ecf_id):
    """Envía un ECF (PDF + QR) al cliente vía WhatsApp usando Twilio"""
    from .models import ECFDocument
    from twilio.rest import Client

    try:
        doc = ECFDocument.objects.select_related("order").get(id=ecf_id)
    except ECFDocument.DoesNotExist:
        return {"error": "ECF no encontrado"}

    phone = doc.order.whatsapp
    if not phone:
        return {"error": "El pedido no tiene un número de WhatsApp asociado"}

    # Ensure phone has country code
    if not phone.startswith("+"):
        if len(phone) == 10:  # e.g. 8095551234
            phone = f"+1{phone}"
        else:
            phone = f"+{phone}"

    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_phone = getattr(settings, "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886") # Twilio Sandbox default

    if not account_sid or not auth_token:
        # Simulate send if no Twilio credentials (Dev Mode)
        doc.whatsapp_sent = True
        doc.save(update_fields=["whatsapp_sent"])
        print(f"[DEV] Simulated WhatsApp sent to {phone} for ECF {doc.ecf_number}")
        return {"status": "success", "simulated": True}

    client = Client(account_sid, auth_token)

    message_body = (
        f"¡Hola! Gracias por visitarnos en D' Yiya Restaurante.\n\n"
        f"Adjunto encontrarás tu comprobante fiscal electrónico (e-CF) "
        f"#{doc.ecf_number}.\n\n"
        f"Monto Total: RD$ {doc.order.total or 0}\n\n"
        f"Ver PDF: {doc.pdf_url}\n"
        f"Ver QR DGII: {doc.qr_code}\n\n"
        f"¡Esperamos verte pronto!"
    )

    try:
        message = client.messages.create(
            from_=from_phone,
            body=message_body,
            to=f"whatsapp:{phone}"
        )
        doc.whatsapp_sent = True
        doc.save(update_fields=["whatsapp_sent"])
        return {"status": "success", "message_sid": message.sid}
    except Exception as exc:
        print("Twilio WhatsApp Error:", exc)
        raise self.retry(exc=exc, countdown=60)

