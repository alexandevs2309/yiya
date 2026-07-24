import time
import random
import logging
import requests
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

BACKOFF_SECONDS = [
    10, 30, 60,
    300, 900, 1800,
    3600, 7200, 14400,
    28800, 86400,
]

STALE_TIMEOUT_MINUTES = 30


class Command(BaseCommand):
    help = 'Ejecuta el worker interno de tareas en background (e-CF)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Worker e-CF iniciado'))
        self._recover_stale_processing()
        while True:
            try:
                self._process_pending_ecf()
            except Exception as e:
                logger.error(f'Error en ciclo worker: {e}')
            time.sleep(10)

    def _recover_stale_processing(self):
        from apps.billing.models import ECFDocument
        cutoff = timezone.now() - timedelta(minutes=STALE_TIMEOUT_MINUTES)
        qs = ECFDocument.objects.filter(status='processing', sent_at__lt=cutoff)
        count = qs.count()
        if count:
            qs.update(status='pending', last_error='Recuperado por stale timeout')
            logger.warning(f'Recuperados {count} documento(s) atascados en PROCESSING')

    def _process_pending_ecf(self):
        from apps.billing.models import ECFDocument
        from apps.billing.utils.alanube_client import send_ecf, check_document_exists
        from django.db import transaction

        with transaction.atomic():
            qs = list(ECFDocument.objects.select_for_update(skip_locked=True).filter(
                status='pending',
            ).order_by('created_at')[:5])

            for doc in qs:
                try:
                    doc.status = 'processing'
                    doc.sent_at = timezone.now()
                    doc.last_error = ''
                    doc.save(update_fields=['status', 'sent_at', 'last_error'])
                except Exception:
                    continue

        for doc in qs:
            try:
                self._send_with_backoff(doc, send_ecf, check_document_exists)
            except Exception as e:
                doc.last_error = str(e)
                doc.attempts += 1
                doc.save(update_fields=['status', 'attempts', 'last_error'])
                logger.error(f'e-CF {doc.id.hex[:8]} ({doc.ncf}) falló: {e}')

    def _send_with_backoff(self, doc, send_ecf_func, check_func):
        if not settings.ALANUBE_API_KEY or not doc.json_payload:
            logger.info(f'e-CF {doc.id.hex[:8]} saltado (sin API key o sin payload)')
            doc.status = 'failed'
            doc.last_error = 'API key o payload ausente'
            doc.sent_at = timezone.now()
            doc.save()
            return

        if doc.attempts > 0:
            idx = min(doc.attempts - 1, len(BACKOFF_SECONDS) - 1)
            backoff = BACKOFF_SECONDS[idx]
            jitter = random.uniform(0.5, 1.5)
            sleep_time = backoff * jitter
            elapsed = time.time() - doc.sent_at.timestamp() if doc.sent_at else sleep_time + 1
            if elapsed < sleep_time:
                return

        try:
            result = send_ecf_func(doc)
        except requests.exceptions.Timeout:
            if check_func(doc):
                doc.status = 'accepted'
                doc.last_error = ''
                logger.info(f'e-CF {doc.id.hex[:8]} ({doc.ncf}): confirmado post-timeout')
            else:
                doc.last_error = 'Timeout en envío a Alanube'
                doc.status = 'pending'
                doc.attempts += 1
                doc.sent_at = timezone.now()
                doc.save()
                logger.warning(f'e-CF {doc.id.hex[:8]} ({doc.ncf}): timeout, será reintentado')
                return
        except Exception as e:
            doc.last_error = str(e)
            doc.status = 'pending'
            doc.attempts += 1
            doc.sent_at = timezone.now()
            doc.save()
            alerta = f'e-CF {doc.id.hex[:8]} ({doc.ncf}): error transitorio ({e}), será reintentado'
            logger.warning(alerta)
            return

        doc.alanube_id = result.get('id', '')
        dgii_status = result.get('status', '')
        if dgii_status in ('REGISTERED', 'accepted', 'ACCEPTED'):
            doc.status = 'accepted'
            doc.last_error = ''
        else:
            doc.status = 'rejected'
            doc.last_error = result.get('errors', str(result))
        nivel = 'info' if doc.status == 'accepted' else 'warning'
        getattr(logger, nivel)(f'e-CF {doc.id.hex[:8]} ({doc.ncf}): {doc.status}')
        doc.attempts += 1
        doc.sent_at = timezone.now()
        doc.save()
