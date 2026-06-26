from django.db import models
from apps.core.models import BaseModel


class Purchase(BaseModel):
    supplier_rnc = models.CharField(
        max_length=20,
        help_text="RNC del proveedor",
    )
    supplier_name = models.CharField(max_length=200)
    date = models.DateField()
    ncf = models.CharField(
        max_length=50,
        help_text="NCF o e-CF del proveedor",
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    itbis = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Compra"
        verbose_name_plural = "Compras (606)"
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.supplier_name} - {self.ncf} - RD${self.total}"
