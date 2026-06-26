from rest_framework import serializers
from .models import User, UserPermissions, WorkSchedule


# ---------------------------------------------------------------------------
# Mapeo de rutas por defecto según rol
# ---------------------------------------------------------------------------

DEFAULT_ROUTES = {
    "owner":     "/dashboard",
    "manager":   "/dashboard",
    "cashier":   "/checkout",
    "waitress":  "/tables",
    "cook":      "/kitchen",
    "bartender": "/kitchen",
    "admin":     "/admin",
    "utility":   "/access-denied",
}


def get_default_route(role: str) -> str:
    return DEFAULT_ROUTES.get(role, "/tables")


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "pin", "phone", "is_active", "session_color",
            "password", "date_joined", "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]
        extra_kwargs = {
            "pin": {"write_only": True, "required": False}
        }

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user


class UserPermissionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPermissions
        fields = [
            "can_void_orders", "can_apply_discount", "can_view_reports",
            "can_manage_menu", "can_open_cashier", "can_manage_users",
            "can_view_all_orders", "discount_limit",
        ]


class WorkScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkSchedule
        fields = ["work_days", "work_start", "work_end"]

    def validate(self, attrs):
        from datetime import datetime, timedelta
        work_start = attrs.get("work_start")
        work_end = attrs.get("work_end")
        if work_start and work_end:
            start_dt = datetime.combine(datetime.today(), work_start)
            end_dt = datetime.combine(datetime.today(), work_end)
            if end_dt <= start_dt:
                raise serializers.ValidationError(
                    {"work_end": "work_end debe ser posterior a work_start."}
                )
            if (end_dt - start_dt) < timedelta(minutes=1):
                raise serializers.ValidationError(
                    {"work_end": "La diferencia mínima entre work_start y work_end es 1 minuto."}
                )
        return attrs


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class PinLoginSerializer(serializers.Serializer):
    pin = serializers.CharField(max_length=6)
