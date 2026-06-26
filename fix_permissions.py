"""
Script para crear UserPermissions a usuarios existentes que no las tienen.
Ejecutar: venv/bin/python manage.py runscript fix_permissions --settings=config.settings.dev
O bien:   venv/bin/python fix_permissions.py (con DJANGO_SETTINGS_MODULE seteado)
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from apps.accounts.models import User, UserPermissions, ROLE_PERMISSION_DEFAULTS

sin_permisos = User.objects.filter(permissions__isnull=True)
print(f"Usuarios sin permisos: {sin_permisos.count()}")

for user in sin_permisos:
    defaults = ROLE_PERMISSION_DEFAULTS.get(user.role, {})
    UserPermissions.objects.create(user=user, **defaults)
    print(f"  ✓ {user.username} ({user.role})")

print("Listo.")
