import uuid
from django.db import models
from django.conf import settings


class PrinterConfig(models.Model):
    CONNECTION_CHOICES = [
        ('usb', 'USB'),
        ('network', 'Red (TCP/IP)'),
        ('file', 'Archivo (debug)'),
    ]
    PRINTER_TYPE_CHOICES = [
        ('receipt', 'Recibo (caja)'),
        ('kitchen', 'Comanda (cocina)'),
        ('bar', 'Barra'),
    ]
    PAPER_SIZE_CHOICES = [
        ('80mm', '80mm'),
        ('58mm', '58mm'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text='Nombre descriptivo ej. "Cocina Principal"')
    type = models.CharField(max_length=10, choices=PRINTER_TYPE_CHOICES, default='receipt')
    connection_type = models.CharField(max_length=10, choices=CONNECTION_CHOICES, default='network')
    ip_address = models.CharField(max_length=45, blank=True, help_text='IP de la impresora de red')
    port = models.IntegerField(default=9100, help_text='Puerto TCP (generalmente 9100)')
    vendor_id = models.CharField(max_length=10, blank=True, help_text='Ej: 0x04b8')
    product_id = models.CharField(max_length=10, blank=True, help_text='Ej: 0x0202')
    file_path = models.CharField(max_length=255, blank=True, help_text='Ruta para imprimir a archivo (debug)')
    paper_size = models.CharField(max_length=4, choices=PAPER_SIZE_CHOICES, default='80mm')
    is_default = models.BooleanField(default=False, help_text='Usar por defecto para este tipo')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Impresora'
        verbose_name_plural = 'Impresoras'

    def __str__(self):
        return f'{self.name} ({self.get_type_display()})'

    def save(self, *args, **kwargs):
        if self.is_default:
            PrinterConfig.objects.filter(type=self.type, is_default=True).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)


class PrintJob(models.Model):
    JOB_TYPE_CHOICES = [
        ('receipt', 'Recibo de pago'),
        ('kitchen', 'Comanda de cocina'),
        ('test', 'Prueba'),
        ('drawer', 'Apertura de gaveta'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('printing', 'Imprimiendo'),
        ('done', 'Completado'),
        ('failed', 'Falló'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=10, choices=JOB_TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', db_index=True)
    data = models.JSONField(help_text='Datos completos del ticket a imprimir')
    printer = models.ForeignKey(PrinterConfig, on_delete=models.SET_NULL, null=True, blank=True)
    payment = models.ForeignKey('billing.Payment', on_delete=models.SET_NULL, null=True, blank=True)
    order = models.ForeignKey('pos.Order', on_delete=models.SET_NULL, null=True, blank=True)
    copies = models.IntegerField(default=1)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    printed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Trabajo de impresión'
        verbose_name_plural = 'Trabajos de impresión'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_type_display()} — {self.get_status_display()}'
