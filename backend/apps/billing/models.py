import uuid
from decimal import Decimal
from datetime import date as date_
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


class NCFSequence(models.Model):
    NCF_TYPES = [
        ('B01', 'Factura de Consumo'),
        ('B04', 'Nota de Crédito'),
        ('B14', 'Gastos Menores'),
    ]
    ncf_type = models.CharField(max_length=3, choices=NCF_TYPES, unique=True)
    prefix = models.CharField(max_length=3, default='A01')
    current_sequence = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    valid_from = models.DateField()
    valid_to = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Secuencia NCF'
        verbose_name_plural = 'Secuencias NCF'

    def __str__(self):
        return f'{self.prefix}{self.ncf_type}{self.current_sequence:08d}'

    def next_ncf(self) -> str:
        self.current_sequence += 1
        self.save(update_fields=['current_sequence'])
        return f'{self.prefix}{self.ncf_type}{self.current_sequence:08d}'


class Payment(models.Model):
    METHOD_CHOICES = [
        ('cash', 'Efectivo'),
        ('cardnet', 'CardNET'),
        ('tpago', 'tPago'),
        ('mixed', 'Mixto'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey('pos.Order', on_delete=models.CASCADE, related_name='payments')
    method = models.CharField(max_length=10, choices=METHOD_CHOICES)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    itbis = models.DecimalField(max_digits=10, decimal_places=2)
    propina = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    cash_received = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    change_given = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    items_json = models.JSONField(blank=True, null=True, help_text='Detalle de ítems pagados')
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_purchases')
    deduct_from_payroll = models.BooleanField(default=False, help_text='Deducir de nómina')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Descuento aplicado')
    discount_reason = models.CharField(max_length=100, blank=True, verbose_name='Motivo del descuento')
    manual_tip = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Propina voluntaria extra')
    voided = models.BooleanField(default=False, help_text='Reembolsado/Anulado')
    voided_at = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=200, blank=True, help_text='Motivo del reembolso')
    voided_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='voided_payments')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'

    def __str__(self):
        return f'Pago {self.id.hex[:8]} - {self.get_method_display()} - ${self.total}'


class ECFDocument(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('processing', 'Procesando'),
        ('sent', 'Enviado'),
        ('accepted', 'Aceptado DGII'),
        ('rejected', 'Rechazado'),
        ('failed', 'Falló envío'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='ecf_documents')
    ncf = models.CharField(max_length=20, blank=True, help_text='Número de Comprobante Fiscal')
    ncf_type = models.CharField(max_length=3, choices=NCFSequence.NCF_TYPES, default='B01')
    rnc_cliente = models.CharField(max_length=11, blank=True)
    razon_social_cliente = models.CharField(max_length=150, blank=True)
    xml_content = models.TextField(blank=True)
    json_payload = models.JSONField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    attempts = models.IntegerField(default=0)
    last_error = models.TextField(blank=True)
    alanube_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    needs_pending_ticket = models.BooleanField(default=False, help_text='DGII no confirmó a tiempo — ticket debe mostrar "Comprobante en proceso"')

    class Meta:
        verbose_name = 'Documento e-CF'
        verbose_name_plural = 'Documentos e-CF'
        ordering = ['-created_at']

    def __str__(self):
        return f'e-CF {self.ncf or self.id.hex[:8]} ({self.get_status_display()})'
