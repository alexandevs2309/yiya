from django.db import models
from apps.core.models import BaseModel


class ECFType(models.TextChoices):
    CREDITO_FISCAL = "01", "Crédito fiscal"
    CONSUMIDOR_FINAL = "02", "Consumidor final"
    NOTA_CREDITO = "04", "Nota de crédito"


class ECFStatus(models.TextChoices):
    PENDING = "pending", "Pendiente"
    APPROVED = "approved", "Aprobado"
    REJECTED = "rejected", "Rechazado"
    FAILED = "failed", "Falló"


class ECFDocument(BaseModel):
    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="ecf_document",
    )
    ecf_type = models.CharField(
        max_length=2,
        choices=ECFType.choices,
        default=ECFType.CONSUMIDOR_FINAL,
    )
    rnc = models.CharField(
        max_length=20,
        blank=True,
        help_text="RNC del cliente (opcional, para Tipo 01)",
    )
    ecf_number = models.CharField(
        max_length=50,
        blank=True,
        help_text="Número e-NCF asignado por DGII",
    )
    status = models.CharField(
        max_length=20,
        choices=ECFStatus.choices,
        default=ECFStatus.PENDING,
    )
    provisional_number = models.CharField(
        max_length=50,
        blank=True,
        help_text="Número de recibo provisional (PROV-XXXX)",
    )
    pdf_url = models.URLField(blank=True)
    qr_code = models.TextField(blank=True)
    whatsapp_sent = models.BooleanField(default=False)
    response_raw = models.JSONField(
        default=dict, blank=True,
        help_text="Respuesta completa del BaaS",
    )
    retries = models.IntegerField(default=0)

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            try:
                from .tasks import submit_ecf
                from django.db import transaction
                transaction.on_commit(lambda: submit_ecf.delay(self.id))
            except Exception:
                # Celery no disponible — el e-CF se procesará manualmente
                pass

    class Meta:
        verbose_name = "Comprobante Fiscal Electrónico"
        verbose_name_plural = "Comprobantes Fiscales Electrónicos"
        ordering = ["-created_at"]

    def __str__(self):
        return f"e-CF {self.ecf_number or self.provisional_number} - {self.get_ecf_type_display()}"
