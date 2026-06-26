from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    label = "accounts"

    def ready(self):
        from django.db.models.signals import post_save
        from django.dispatch import receiver

        from .models import User, UserPermissions, ROLE_PERMISSION_DEFAULTS

        @receiver(post_save, sender=User)
        def create_user_permissions(sender, instance, created, **kwargs):
            if created:
                defaults = ROLE_PERMISSION_DEFAULTS.get(instance.role, {})
                UserPermissions.objects.create(user=instance, **defaults)
