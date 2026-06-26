from datetime import datetime
from zoneinfo import ZoneInfo

from django.contrib.auth import authenticate
from django.core.cache import cache
from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit.helpers import log
from .models import User, UserPermissions, WorkSchedule, hash_pin
from .permissions import IsAdmin, HasGranularPermission
from .serializers import (
    UserSerializer, LoginSerializer, PinLoginSerializer,
    UserPermissionsSerializer, WorkScheduleSerializer, get_default_route,
)

# Redis key helpers
PIN_FAILS_KEY   = "pin_fails:{}"
PIN_BLOCKED_KEY = "pin_blocked:{}"
BLACKLIST_KEY   = "blacklist:{}"
PIN_MAX_TRIES   = 5
PIN_BLOCK_TTL   = 300  # segundos
SANTO_DOMINGO   = ZoneInfo("America/Santo_Domingo")


def _build_auth_response(user):
    """Construye el payload de respuesta de autenticación."""
    refresh = RefreshToken.for_user(user)
    perms_data = {}
    try:
        perms_data = UserPermissionsSerializer(user.permissions).data
    except Exception:
        pass
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
        "permissions": perms_data,
        "default_route": get_default_route(user.role),
    }


def _get_client_ip(request):
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuthRateThrottle(AnonRateThrottle):
    scope = "auth"


# ---------------------------------------------------------------------------
# Auth views
# ---------------------------------------------------------------------------

class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None or not user.is_active:
            return Response(
                {"error": "Credenciales inválidas"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        # Check work schedule
        schedule_error = _check_work_schedule(user)
        if schedule_error:
            return schedule_error
        with transaction.atomic():
            log("login", user, ip_address=_get_client_ip(request))
        return Response(_build_auth_response(user))


class PinLoginView(generics.GenericAPIView):
    serializer_class = PinLoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = _get_client_ip(request)

        # Intentar encontrar usuario por PIN primero (necesitamos user_id para rate limiting)
        pin_value = serializer.validated_data["pin"]
        hashed = hash_pin(pin_value)

        # Buscar usuario por PIN hasheado
        try:
            user = User.objects.get(pin=hashed)
        except User.DoesNotExist:
            # No sabemos qué usuario es — log sin user_id específico
            return Response({"error": "PIN inválido"}, status=status.HTTP_401_UNAUTHORIZED)

        user_id = str(user.id)

        # Capa 1: verificar bloqueo activo
        remaining = cache.get(PIN_BLOCKED_KEY.format(user_id))
        if remaining is not None:
            with transaction.atomic():
                log("failed_pin", user, detail={"reason": "blocked"}, ip_address=ip)
            return Response(
                {"error": "Demasiados intentos. Intenta de nuevo más tarde.", "remaining_seconds": cache.ttl(PIN_BLOCKED_KEY.format(user_id)) or PIN_BLOCK_TTL},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Capa 2: verificar cuenta activa
        if not user.is_active:
            return Response({"error": "Cuenta desactivada"}, status=status.HTTP_403_FORBIDDEN)

        # Capa 3: verificar schedule
        schedule_error = _check_work_schedule(user)
        if schedule_error:
            return schedule_error

        # Capa 4: resetear contador y hacer login
        cache.delete(PIN_FAILS_KEY.format(user_id))
        with transaction.atomic():
            log("login", user, ip_address=ip)
        return Response(_build_auth_response(user))


def _check_work_schedule(user):
    """Retorna Response 403 si el usuario está fuera de su horario. None si OK."""
    try:
        schedule = user.work_schedule
    except WorkSchedule.DoesNotExist:
        return None

    now = datetime.now(tz=SANTO_DOMINGO)
    current_day = now.weekday()  # 0=lunes, 6=domingo
    current_time = now.time()

    if current_day not in schedule.work_days:
        return Response(
            {"error": f"Acceso no permitido. Días permitidos: {schedule.work_days}"},
            status=status.HTTP_403_FORBIDDEN,
        )
    if not (schedule.work_start <= current_time <= schedule.work_end):
        return Response(
            {"error": f"Acceso no permitido. Horario permitido: {schedule.work_start}–{schedule.work_end}"},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            # Add to blacklist
            jti = str(token.get("jti", ""))
            if jti:
                ttl = int(token.get("exp", 0)) - int(datetime.now().timestamp())
                if ttl > 0:
                    cache.set(BLACKLIST_KEY.format(jti), 1, ttl)
            token.blacklist()
        except Exception:
            pass
        with transaction.atomic():
            log("logout", request.user, ip_address=_get_client_ip(request))
        return Response({"detail": "Sesión cerrada correctamente"})


# ---------------------------------------------------------------------------
# User management views
# ---------------------------------------------------------------------------

class UserListView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, HasGranularPermission("can_manage_users")]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, HasGranularPermission("can_manage_users")]

    def update(self, request, *args, **kwargs):
        # Prevent self role/permissions escalation
        if str(request.user.pk) == str(kwargs.get("pk")):
            if "role" in request.data:
                return Response(
                    {"error": "No puedes modificar tu propio rol."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().update(request, *args, **kwargs)


class MyPermissionsView(APIView):
    """GET /auth/me/permissions/ — permisos del usuario autenticado."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            perms = UserPermissionsSerializer(request.user.permissions).data
        except Exception:
            perms = {}
        return Response(perms)


class UserPermissionsView(APIView):
    """PATCH /auth/users/{id}/permissions/ — actualiza permisos de otro usuario."""
    permission_classes = [IsAuthenticated, HasGranularPermission("can_manage_users")]

    def patch(self, request, pk):
        if str(request.user.pk) == str(pk):
            return Response(
                {"error": "No puedes modificar tus propios permisos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        try:
            perms = user.permissions
        except UserPermissions.DoesNotExist:
            return Response({"error": "Permisos no encontrados."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserPermissionsSerializer(perms, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
            log(
                "manage_user", request.user,
                target_id=user.id, target_type="UserPermissions",
                detail={"updated": request.data},
                ip_address=_get_client_ip(request),
            )
        return Response(serializer.data)


class InvalidateSessionView(APIView):
    """POST /auth/{user_id}/invalidate-session/ — invalida tokens de otro usuario."""
    permission_classes = [IsAuthenticated, HasGranularPermission("can_manage_users")]
    url_name = "account-invalidate-session"

    def post(self, request, user_id):
        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get("reason", "")
        # Agregar token actual del target al blacklist
        # (En producción se necesitaría un store de tokens activos; aquí usamos una clave genérica)
        cache.set(f"session_invalidated:{user_id}", 1, 60 * 60 * 8)  # 8h máx (duración refresh)

        with transaction.atomic():
            log(
                "manage_user", request.user,
                target_id=target.id, target_type="User",
                detail={"action": "invalidate_session", "reason": reason, "target_username": target.username},
                ip_address=_get_client_ip(request),
            )
        return Response({"detail": f"Sesión de {target.username} invalidada."})


class UnlockUserView(APIView):
    """POST /auth/{user_id}/unlock/ — desbloquea PIN de otro usuario."""
    permission_classes = [IsAuthenticated, HasGranularPermission("can_manage_users")]

    def post(self, request, user_id):
        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        blocked_key = PIN_BLOCKED_KEY.format(str(target.id))
        if not cache.get(blocked_key):
            return Response(
                {"error": "El usuario no está bloqueado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache.delete(blocked_key)
        cache.delete(PIN_FAILS_KEY.format(str(target.id)))

        with transaction.atomic():
            log(
                "manage_user", request.user,
                target_id=target.id, target_type="User",
                detail={"action": "unlock_pin", "target_username": target.username},
                ip_address=_get_client_ip(request),
            )
        return Response({"detail": f"Usuario {target.username} desbloqueado."})


class ChangePinView(APIView):
    """POST /auth/me/change-pin/ — cambia el PIN del usuario autenticado."""
    permission_classes = [IsAuthenticated]
    url_name = "account-change-pin"

    def post(self, request):
        current_pin = request.data.get("current_pin", "")
        new_pin = request.data.get("new_pin", "")

        if not current_pin or not new_pin:
            return Response(
                {"error": "Se requieren current_pin y new_pin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (4 <= len(new_pin) <= 6 and new_pin.isdigit()):
            return Response(
                {"error": "El PIN debe ser numérico y tener entre 4 y 6 dígitos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if user.pin != hash_pin(current_pin):
            return Response(
                {"error": "El PIN actual es incorrecto."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.pin = new_pin  # El save() del modelo hashea automáticamente
        user.save()
        return Response({"detail": "PIN actualizado correctamente."})


class WorkScheduleView(APIView):
    """PATCH /auth/users/{pk}/schedule/ — crea, actualiza o elimina el horario de un usuario."""
    permission_classes = [IsAuthenticated, HasGranularPermission("can_manage_users")]

    def patch(self, request, pk):
        if str(request.user.pk) == str(pk):
            return Response(
                {"error": "No puedes modificar tu propio horario."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Si el body está vacío, eliminar el schedule
        if not request.data:
            WorkSchedule.objects.filter(user=target).delete()
            return Response({"detail": "Horario eliminado."})

        try:
            schedule = target.work_schedule
            serializer = WorkScheduleSerializer(schedule, data=request.data, partial=True)
        except WorkSchedule.DoesNotExist:
            serializer = WorkScheduleSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        serializer.save(user=target)
        return Response(serializer.data)
