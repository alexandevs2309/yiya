from celery import shared_task


@shared_task
def check_schedule_expiry():
    """
    Corre cada minuto. Invalida sesiones de usuarios cuyo work_end pasó hace más de 60s.
    """
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo
    from django.core.cache import cache
    from apps.audit.helpers import log
    from .models import WorkSchedule, User

    SANTO_DOMINGO = ZoneInfo("America/Santo_Domingo")
    now = datetime.now(tz=SANTO_DOMINGO)
    grace = timedelta(seconds=60)

    for schedule in WorkSchedule.objects.select_related("user").all():
        user = schedule.user
        if not user.is_active:
            continue
        # Verificar si pasó work_end + gracia
        end_dt = datetime.combine(now.date(), schedule.work_end, tzinfo=SANTO_DOMINGO)
        if now > (end_dt + grace):
            cache.set(f"session_invalidated:{str(user.id)}", 1, 60 * 60 * 8)
            try:
                log(
                    "logout", user,
                    detail={"reason": "schedule_end"},
                )
            except Exception:
                pass
