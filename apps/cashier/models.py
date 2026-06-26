from django.db import models
from apps.core.models import BaseModel


class CashRegister(BaseModel):
    opened_at = models.DateTimeField()
    closed_at = models.DateTimeField(null=True, blank=True)
    opened_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="opened_registers",
    )
    closed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="closed_registers",
    )
    initial_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expected_cash = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
    actual_cash = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
    difference = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
    status = models.CharField(
        max_length=10,
        choices=[("open", "Abierta"), ("closed", "Cerrada")],
        default="open",
    )
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Caja"
        verbose_name_plural = "Cajas"
        ordering = ["-opened_at"]

    def __str__(self):
        return f"Caja #{self.id_short} - {self.opened_at.date()}"

    @property
    def id_short(self):
        return str(self.id)[:8]
