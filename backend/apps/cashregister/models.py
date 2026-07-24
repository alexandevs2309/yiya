import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum, Q
from django.conf import settings

class CashRegister(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cash_registers')
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    closing_balance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expected_cash = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_cash = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    difference = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('open', 'Abierto'),
        ('closed', 'Cerrado'),
    ], default='open')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Caja'
        verbose_name_plural = 'Cajas'
        ordering = ['-opened_at']

    def __str__(self):
        return f'{self.user.get_full_name() or self.user.username} — {self.opened_at.strftime("%d/%m/%Y %H:%M")}'

    def calculate_expected(self):
        from apps.billing.models import Payment
        q = Q(processed_by=self.user, created_at__gte=self.opened_at, voided=False)
        if self.closed_at:
            q &= Q(created_at__lte=self.closed_at)
        sales = Payment.objects.filter(q).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return self.opening_balance + sales

    def close(self, actual_cash: Decimal, notes: str = ''):
        from django.utils import timezone
        self.expected_cash = self.calculate_expected()
        self.actual_cash = actual_cash
        self.difference = actual_cash - self.expected_cash
        self.closing_balance = actual_cash
        self.closed_at = timezone.now()
        self.status = 'closed'
        self.notes = notes
        self.save()


class CashMovement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    register = models.ForeignKey(CashRegister, on_delete=models.CASCADE, related_name='movements')
    type = models.CharField(max_length=20, choices=[
        ('entry', 'Entrada'),
        ('exit', 'Salida'),
        ('sale', 'Venta'),
        ('payment', 'Pago'),
    ])
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Movimiento de Caja'
        verbose_name_plural = 'Movimientos de Caja'
        ordering = ['-created_at']
