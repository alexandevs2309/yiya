from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id", "action", "actor_id", "actor_username",
            "target_id", "target_type", "detail",
            "ip_address", "timestamp",
        ]
        read_only_fields = fields
