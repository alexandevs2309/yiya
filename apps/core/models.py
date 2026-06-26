import uuid
from django.db import models


class TimeStampedMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UUIDMixin(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TenantMixin(models.Model):
    tenant_id = models.UUIDField(
        default=uuid.uuid4,
        db_index=True,
        null=True,
        blank=True,
        help_text="Reservado para multitenant en v2",
    )

    class Meta:
        abstract = True


class BaseModel(UUIDMixin, TimeStampedMixin, TenantMixin):
    class Meta:
        abstract = True
