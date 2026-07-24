from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Custom permission to only allow admins to access.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')

class IsCashierOrAdmin(permissions.BasePermission):
    """
    Custom permission for cashiers and admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['admin', 'cashier'])

class IsWaiterCashierOrAdmin(permissions.BasePermission):
    """
    Custom permission for front of house staff (waiters, cashiers, admins).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['admin', 'cashier', 'waiter'])

class IsCookOrAdmin(permissions.BasePermission):
    """
    Custom permission for kitchen staff and admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['admin', 'cook'])
