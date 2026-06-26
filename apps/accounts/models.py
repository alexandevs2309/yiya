import uuid
import hashlib
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class Role(models.TextChoices):
    ADMIN = "admin", _("Administrador")
    WAITRESS = "waitress", _("Mesera")
    COOK = "cook", _("Cocinero")
    UTILITY = "utility", _("Utility / Stewart")
    OWNER = "owner", _("Propietario")
    MANAGER = "manager", _("Gerente")
    CASHIER = "cashier", _("Cajero")
    BARTENDER = "bartender", _("Bartender")


def hash_pin(pin: str) -> str:
    if not pin:
        return ""
    # Cryptographic salt for local security
    salt = "diyiya_pos_samana_secret_salt_2026"
    return hashlib.sha256((pin + salt).encode('utf-8')).hexdigest()


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.WAITRESS,
    )
    pin = models.CharField(
        max_length=128,
        blank=True,
        help_text="PIN de 4-6 dígitos (almacenado como hash SHA-256)",
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        help_text="Teléfono del empleado",
    )
    is_active = models.BooleanField(default=True)
    session_color = models.CharField(
        max_length=7,
        default="#0EA5E9",
        help_text="Color hexadecimal para identificar la sesión del usuario",
    )

    class Meta:
        verbose_name = _("Usuario")
        verbose_name_plural = _("Usuarios")
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    def save(self, *args, **kwargs):
        # Hash the PIN only if it is in plaintext (digits of length 4-6)
        if self.pin and len(self.pin) <= 6 and self.pin.isdigit():
            self.pin = hash_pin(self.pin)
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# Defaults de permisos por rol (usado en la señal post_save de User)
# ---------------------------------------------------------------------------

ROLE_PERMISSION_DEFAULTS = {
    Role.OWNER: {
        "can_void_orders": True, "can_apply_discount": True,
        "can_view_reports": True, "can_manage_menu": True,
        "can_open_cashier": True, "can_manage_users": True,
        "can_view_all_orders": True, "discount_limit": 100,
    },
    Role.ADMIN: {
        "can_void_orders": True, "can_apply_discount": True,
        "can_view_reports": True, "can_manage_menu": True,
        "can_open_cashier": True, "can_manage_users": True,
        "can_view_all_orders": True, "discount_limit": 100,
    },
    Role.MANAGER: {
        "can_void_orders": True, "can_apply_discount": True,
        "can_view_reports": True, "can_manage_menu": False,
        "can_open_cashier": True, "can_manage_users": False,
        "can_view_all_orders": True, "discount_limit": 20,
    },
    Role.CASHIER: {
        "can_void_orders": False, "can_apply_discount": True,
        "can_view_reports": False, "can_manage_menu": False,
        "can_open_cashier": True, "can_manage_users": False,
        "can_view_all_orders": True, "discount_limit": 10,
    },
    Role.BARTENDER: {
        "can_void_orders": False, "can_apply_discount": False,
        "can_view_reports": False, "can_manage_menu": False,
        "can_open_cashier": False, "can_manage_users": False,
        "can_view_all_orders": True, "discount_limit": 0,
    },
    Role.WAITRESS: {
        "can_void_orders": False, "can_apply_discount": False,
        "can_view_reports": False, "can_manage_menu": False,
        "can_open_cashier": False, "can_manage_users": False,
        "can_view_all_orders": False, "discount_limit": 5,
    },
    Role.COOK: {
        "can_void_orders": False, "can_apply_discount": False,
        "can_view_reports": False, "can_manage_menu": False,
        "can_open_cashier": False, "can_manage_users": False,
        "can_view_all_orders": False, "discount_limit": 0,
    },
    Role.UTILITY: {
        "can_void_orders": False, "can_apply_discount": False,
        "can_view_reports": False, "can_manage_menu": False,
        "can_open_cashier": False, "can_manage_users": False,
        "can_view_all_orders": False, "discount_limit": 0,
    },
}


# ---------------------------------------------------------------------------
# Task 2.1 — UserPermissions
# ---------------------------------------------------------------------------

class UserPermissions(BaseModel):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="permissions",
    )
    can_void_orders = models.BooleanField(default=False)
    can_apply_discount = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)
    can_manage_menu = models.BooleanField(default=False)
    can_open_cashier = models.BooleanField(default=False)
    can_manage_users = models.BooleanField(default=False)
    can_view_all_orders = models.BooleanField(default=False)
    discount_limit = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Porcentaje máximo de descuento permitido [0–100]",
    )

    class Meta:
        verbose_name = "Permisos de usuario"
        verbose_name_plural = "Permisos de usuario"

    def __str__(self):
        return f"Permisos de {self.user.username}"


# ---------------------------------------------------------------------------
# Task 2.3 — WorkSchedule
# ---------------------------------------------------------------------------

def validate_work_days(value):
    from django.core.exceptions import ValidationError
    if not isinstance(value, list) or not value:
        raise ValidationError("work_days debe ser una lista no vacía.")
    if len(value) > 7:
        raise ValidationError("work_days no puede tener más de 7 elementos.")
    if len(set(value)) != len(value):
        raise ValidationError("work_days no puede tener días duplicados.")
    for day in value:
        if not isinstance(day, int) or day < 0 or day > 6:
            raise ValidationError("Cada día debe ser un entero entre 0 (lunes) y 6 (domingo).")


class WorkSchedule(BaseModel):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="work_schedule",
    )
    work_days = models.JSONField(
        validators=[validate_work_days],
        help_text="Lista de días permitidos: 0=lunes … 6=domingo",
    )
    work_start = models.TimeField(help_text="Hora de inicio HH:MM")
    work_end = models.TimeField(help_text="Hora de fin HH:MM")

    class Meta:
        verbose_name = "Horario laboral"
        verbose_name_plural = "Horarios laborales"

    def clean(self):
        from django.core.exceptions import ValidationError
        from datetime import datetime, timedelta
        if self.work_start and self.work_end:
            start_dt = datetime.combine(datetime.today(), self.work_start)
            end_dt = datetime.combine(datetime.today(), self.work_end)
            if end_dt <= start_dt:
                raise ValidationError("work_end debe ser posterior a work_start.")
            if (end_dt - start_dt) < timedelta(minutes=1):
                raise ValidationError(
                    "La diferencia entre work_start y work_end debe ser de al menos 1 minuto."
                )

    def __str__(self):
        return f"Horario de {self.user.username}: {self.work_start}–{self.work_end}"
