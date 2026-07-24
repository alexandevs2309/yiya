import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

STALE_TIMEOUT_MINUTES = 30


class Command(BaseCommand):
    help = 'Reconcilia documentos e-CF atascados (PROCESSING stale, SENT sin confirmación, FAILED transitorios)'

    def handle(self, *args, **options):
        from apps.billing.models import ECFDocument
        from apps.billing.utils.alanube_client import check_document_exists

        self.stdout.write(self.style.SUCCESS('RecoveryWorker e-CF iniciado'))

        cutoff = timezone.now() - timedelta(minutes=STALE_TIMEOUT_MINUTES)

        stale_processing = ECFDocument.objects.filter(
            status='processing', sent_at__lt=cutoff,
        )
        stale_count = stale_processing.count()
        if stale_count:
            stale_processing.update(
                status='pending',
                last_error='Recuperado por RecoveryWorker (PROCESSING stale)',
            )
            logger.warning(f'RecoveryWorker: {stale_count} PROCESSING -> PENDING')

        sent_no_confirm = ECFDocument.objects.filter(
            status='sent',
        )
        for doc in sent_no_confirm:
            try:
                exists = check_document_exists(doc)
            except Exception as e:
                logger.error(f'RecoveryWorker: error consultando {doc.ncf}: {e}')
                continue
            if exists:
                doc.status = 'accepted'
                doc.last_error = ''
                doc.save(update_fields=['status', 'last_error'])
                logger.info(f'RecoveryWorker: SENT -> ACCEPTED ({doc.ncf})')
            else:
                doc.status = 'pending'
                doc.last_error = 'Recuperado por RecoveryWorker (SENT sin confirmación)'
                doc.save(update_fields=['status', 'last_error'])
                logger.warning(f'RecoveryWorker: SENT -> PENDING ({doc.ncf})')

        failed_docs = ECFDocument.objects.filter(
            status='failed', attempts__lt=5,
        )
        for doc in failed_docs:
            try:
                exists = check_document_exists(doc)
            except Exception as e:
                logger.error(f'RecoveryWorker: error consultando {doc.ncf}: {e}')
                continue
            if exists:
                doc.status = 'accepted'
                doc.last_error = ''
                doc.save(update_fields=['status', 'last_error'])
                logger.info(f'RecoveryWorker: FAILED -> ACCEPTED ({doc.ncf})')
            else:
                doc.status = 'pending'
                doc.last_error = 'Recuperado por RecoveryWorker (FAILED transitorio)'
                doc.attempts = 0
                doc.sent_at = None
                doc.save(update_fields=['status', 'last_error', 'attempts', 'sent_at'])
                logger.info(f'RecoveryWorker: FAILED -> PENDING ({doc.ncf})')

        self.stdout.write(self.style.SUCCESS(f'RecoveryWorker completado: {stale_count + sent_no_confirm.count() + failed_docs.count()} documentos revisados'))
