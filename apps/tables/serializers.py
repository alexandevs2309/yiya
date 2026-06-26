from rest_framework import serializers
from .models import Zone, Table, TableStatus


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = "__all__"


class TableSerializer(serializers.ModelSerializer):
    minutes_occupied = serializers.IntegerField(read_only=True)
    zone_name = serializers.CharField(source="zone.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = "__all__"

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None


class TableStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TableStatus.choices)
