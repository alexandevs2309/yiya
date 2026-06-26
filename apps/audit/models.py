import uuid
from django.db import models


class AuditAction(models.TextChoices):
    VOID_ORDER       = "void_order",       "Anulación de orden"
    APPLY_DISCOUNT   = "apply_discount",   "Descuento aplicado"
    LOGIN            = "login",            "Inicio de sesión"
    LOGOUT           = "logout",           "Cierre de sesión"
    FAILED_PIN       = "failed_pin",       "PIN fallido"
    MANAGE_USER      = "manage_user",      "Gestión de usuario"
    OPEN_CASHIER     = "open_cashier",     "Apertura de caja"
    CLOSE_CASHIER    = "close_cashier",    "Cierre de caja"
    CHANGE_PRICE     = "change_price",     "Cambio de precio"
    DELETE_MENU_ITEM = "delete_menu_item", "Eliminación de ítem de menú"


class AuditLog(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action         = models.CharField(max_length=50, choices=AuditAction.choices, db_index=True)
    actor_id       = models.UUIDField(db_index=True)
    actor_username = models.CharField(max_length=150)
    target_id      = models.UUIDField(null=True, blank=True)
    target_type    = models.CharField(max_length=50, blank=True)
    detail         = models.JSONField(default=dict)
    ip_address     = models.GenericIPAddressField(null=True, blank=True)
    timestamp      = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Entrada de auditoría"
        verbose_name_plural = "Entradas de auditoría"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["action", "timestamp"], name="audit_action_ts_idx"),
        ]

    def save(self, *args, **kwargs):
        # Solo permite INSERT — bloquea UPDATE
        if not self._state.adding:
            raise PermissionError("Las entradas de AuditLog son inmutables.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Las entradas de AuditLog no pueden eliminarse.")

    def __str__(self):
        return f"[{self.timestamp}] {self.action} — {self.actor_username}"
