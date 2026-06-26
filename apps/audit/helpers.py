from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.contrib.auth import get_user_model
    User = get_user_model()


def log(
    action: str,
    actor,
    *,
    target_id=None,
    target_type: str = "",
    detail: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Crea una entrada en AuditLog dentro de la transacción del caller.
    Si falla, lanza excepción para que el caller revierte su transacción.
    """
    from .models import AuditLog
    AuditLog.objects.create(
        action=action,
        actor_id=actor.id,
        actor_username=actor.username,
        target_id=target_id,
        target_type=target_type,
        detail=detail or {},
        ip_address=ip_address,
    )
