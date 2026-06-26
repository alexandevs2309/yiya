import uuid
from django.db import models
from apps.core.models import BaseModel


class OrderStatus(models.TextChoices):
    OPEN = "open", "Abierta"
    BILLING = "billing", "Pidiendo cuenta"
    PAID = "paid", "Pagada"
    VOID = "void", "Anulada"


class ItemStatus(models.TextChoices):
    PENDING = "pending", "Pendiente"
    PREPARING = "preparing", "Preparando"
    READY = "ready", "Listo"
    DELIVERED = "delivered", "Entregado"


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Efectivo"
    CARD = "card", "CardNET / Azul"
    TRANSFER = "transfer", "Transferencia"
    MIXED = "mixed", "Pago mixto"


class Order(BaseModel):
    table = models.ForeignKey(
        "tables.Table",
        on_delete=models.CASCADE,
        related_name="orders",
    )
    waitress = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="orders",
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.OPEN,
    )
    diners = models.IntegerField(default=1)
    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
    itbis = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
    tip = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
    total = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        null=True, blank=True,
    )
    amount_received = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
    change = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
    receipt_number = models.CharField(
        max_length=20, null=True, blank=True, unique=True,
    )
    rnc = models.CharField(
        max_length=11, null=True, blank=True,
        help_text="RNC del cliente para e-CF",
    )
    whatsapp = models.CharField(
        max_length=20, null=True, blank=True,
        help_text="WhatsApp del cliente para enviar e-CF",
    )
    billing_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Cuándo pidió la cuenta",
    )
    offline_id = models.UUIDField(
        null=True, blank=True,
        help_text="UUID del cliente para sync offline",
    )
    synced = models.BooleanField(default=True)
    synced_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Orden"
        verbose_name_plural = "Órdenes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Orden #{self.id_short} - Mesa {self.table.number}"

    @property
    def id_short(self):
        return str(self.id)[:8]


class OrderItem(BaseModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    menu_item = models.ForeignKey(
        "menu.MenuItem",
        on_delete=models.SET_NULL,
        null=True,
    )
    name = models.CharField(max_length=200)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=1)
    modifiers = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=ItemStatus.choices,
        default=ItemStatus.PENDING,
    )
    prepared_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Ítem de orden"
        verbose_name_plural = "Ítems de orden"

    def __str__(self):
        return f"{self.quantity}x {self.name}"

    @property
    def total_price(self):
        return self.unit_price * self.quantity
