from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsWaitress(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "waitress"


class IsCook(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "cook"


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role == "admin"


def HasGranularPermission(perm_name: str):
    """
    Factory que devuelve una clase DRF permission para el permiso granular dado.
    Uso: permission_classes = [IsAuthenticated, HasGranularPermission("can_void_orders")]
    """
    class _Permission(permissions.BasePermission):
        message = {"required_permission": perm_name}

        def has_permission(self, request, view):
            if not request.user.is_authenticated:
                return False
            try:
                return bool(getattr(request.user.permissions, perm_name, False))
            except Exception:
                return False

    _Permission.__name__ = f"HasGranularPermission_{perm_name}"
    return _Permission


# Endpoints de escritura permitidos para el rol owner
_OWNER_WRITE_ALLOWED_NAMES = {"account-change-pin", "account-invalidate-session"}


class IsOwnerReadOnly(permissions.BasePermission):
    """
    El rol owner solo puede usar métodos seguros (GET, HEAD, OPTIONS).
    Excepción: change-pin e invalidate-session.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != "owner":
            return True  # No aplica a otros roles
        if request.method in permissions.SAFE_METHODS:
            return True
        # Permitir solo estos dos endpoints de escritura para owner
        view_name = getattr(view, "url_name", None) or getattr(view, "name", None)
        if view_name in _OWNER_WRITE_ALLOWED_NAMES:
            return True
        # Registrar intento denegado en AuditLog
        try:
            from apps.audit.helpers import log
            log(
                "manage_user",
                request.user,
                detail={
                    "status": "denied",
                    "method": request.method,
                    "path": request.path,
                    "reason": "owner_read_only",
                },
                ip_address=request.META.get("REMOTE_ADDR"),
            )
        except Exception:
            pass
        return False
