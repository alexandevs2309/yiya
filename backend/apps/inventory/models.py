import uuid
from django.db import models
from django.conf import settings
from apps.core.models import SoftDeleteMixin


class InventoryItem(SoftDeleteMixin, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=50, default='Otros')
    unit = models.CharField(max_length=20, default='unidad')
    stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    barcode = models.CharField(max_length=50, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Item de inventario'
        verbose_name_plural = 'Items de inventario'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def is_low(self):
        return self.stock <= self.min_stock

    @property
    def total_value(self):
        return self.stock * self.cost_per_unit


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('partial', 'Parcial'),
        ('completed', 'Completada'),
        ('cancelled', 'Cancelada'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Orden de compra'
        verbose_name_plural = 'Ordenes de compra'
        ordering = ['-created_at']

    def __str__(self):
        return f'PO-{self.id.hex[:8]} ({self.get_status_display()})'


class MenuItemRecipe(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    menu_item = models.ForeignKey('pos.MenuItem', on_delete=models.CASCADE, related_name='recipes')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='recipes')
    quantity = models.DecimalField(max_digits=10, decimal_places=4, help_text='Cantidad consumida por plato')

    class Meta:
        verbose_name = 'Receta de item'
        verbose_name_plural = 'Recetas de items'
        unique_together = ('menu_item', 'inventory_item')

    def __str__(self):
        return f'{self.menu_item.name} <- {self.quantity} {self.inventory_item.unit} de {self.inventory_item.name}'


class TransactionLog(models.Model):
    TRANSACTION_TYPES = [
        ('sale', 'Venta'),
        ('purchase', 'Compra'),
        ('adjustment', 'Ajuste'),
        ('return', 'Devolución'),
        ('waste', 'Merma'),
        ('transfer', 'Transferencia'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text='Cantidad (negativa = salida)')
    stock_before = models.DecimalField(max_digits=10, decimal_places=2)
    stock_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True, help_text='Ej: Order #123, PO-456')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Movimiento de inventario'
        verbose_name_plural = 'Movimientos de inventario (Kardex)'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_type_display()} — {self.item.name} ({self.quantity})'
