from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Render/deploy uchun admin foydalanuvchi (admin / demo123)."

    def handle(self, *args, **options):
        User = get_user_model()
        if User.objects.filter(username="admin").exists():
            self.stdout.write("Admin allaqachon mavjud")
            return

        user = User.objects.create_superuser(
            "admin",
            "admin@example.com",
            "demo123",
        )
        if hasattr(User, "Role"):
            user.role = User.Role.ADMIN
            user.save(update_fields=["role"])
        self.stdout.write(self.style.SUCCESS("Admin yaratildi: admin / demo123"))
