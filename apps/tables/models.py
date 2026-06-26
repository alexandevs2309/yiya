from django.db import models
from django.utils import timezone
from apps.core.models import BaseModel


class Zone(BaseModel):
    name = models.CharField(max_length=100)
    color = models.CharField(
        max_length=7,
        default="#0EA5E9",
        help_text="Color de la zona para identificación visual",
    )
    sort_order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Zona"
        verbose_name_plural = "Zonas"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class TableStatus(models.TextChoices):
    FREE = "free", "Libre"
    OCCUPIED = "occupied", "Ocupada"
    BILLING = "billing", "Pidiendo cuenta"
    RESERVED = "reserved", "Reservada"


class Table(BaseModel):
    number = models.IntegerField()
    zone = models.ForeignKey(
        Zone,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="tables",
    )
    capacity = models.IntegerField(default=4)
    status = models.CharField(
        max_length=20,
        choices=TableStatus.choices,
        default=TableStatus.FREE,
    )
    opened_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="assigned_tables",
    )
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Mesa"
        verbose_name_plural = "Mesas"
        ordering = ["number"]

    def __str__(self):
        return f"Mesa {self.number}"

    @property
    def minutes_occupied(self):
        if not self.opened_at or self.status == TableStatus.FREE:
            return 0
        delta = timezone.now() - self.opened_at
        return int(delta.total_seconds() / 60)
