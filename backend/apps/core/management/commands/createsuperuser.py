from django.contrib.auth.management.commands import createsuperuser


class Command(createsuperuser.Command):
    def handle(self, *args, **options):
        super().handle(*args, **options)
        user = self.UserModel.objects.filter(is_superuser=True).last()
        if user and user.role != 'admin':
            user.role = 'admin'
            user.save(update_fields=['role'])