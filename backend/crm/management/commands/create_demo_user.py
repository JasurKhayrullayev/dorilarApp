from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Render deploy: admin/demo123 yaratadi yoki parolini tiklaydi."

    def handle(self, *args, **options):
        User = get_user_model()
        try:
            u = User.objects.get(username="admin")
            u.set_password("demo123")
            u.is_active = True
            u.is_staff = True
            u.is_superuser = True
            if hasattr(User, "Role"):
                u.role = User.Role.ADMIN
            u.save()
            self.stdout.write(self.style.SUCCESS("Admin paroli tiklandi: admin / demo123"))
        except User.DoesNotExist:
            u = User(
                username="admin",
                email="admin@example.com",
                is_active=True,
                is_staff=True,
                is_superuser=True,
            )
            if hasattr(User, "Role"):
                u.role = User.Role.ADMIN
            u.set_password("demo123")
            u.save()
            self.stdout.write(self.style.SUCCESS("Admin yaratildi: admin / demo123"))
