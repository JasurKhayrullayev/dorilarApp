from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from crm.models import (
    Category,
    Customer,
    Prescription,
    PrescriptionItem,
    Product,
    User,
)


class Command(BaseCommand):
    help = "Demonstratsion ma'lumotlar va foydalanuvchilar (parol: demo123)"

    def handle(self, *args, **options):
        users_spec = [
            ("admin", User.Role.ADMIN, "Administrator"),
            ("menejer", User.Role.MANAGER, "Menejer"),
            ("vrach", User.Role.DOCTOR, "Vrach"),
            ("aptekachi", User.Role.PHARMACIST, "Aptekachi"),
            ("operator", User.Role.OPERATOR, "Operator"),
        ]
        for username, role, first in users_spec:
            u, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@bad-crm.local",
                    "role": role,
                    "first_name": first,
                    "is_staff": role == User.Role.ADMIN,
                    "is_superuser": role == User.Role.ADMIN,
                    "is_active": True,
                },
            )
            if created or not u.has_usable_password():
                u.set_password("demo123")
            u.role = role
            u.is_active = True
            if role == User.Role.ADMIN:
                u.is_staff = True
                u.is_superuser = True
            u.save()
            self.stdout.write(self.style.SUCCESS(f"User {username} / demo123"))

        cat, _ = Category.objects.get_or_create(slug="vitaminlar", defaults={"name": "Vitaminlar"})
        p1, _ = Product.objects.get_or_create(
            name="D3 vitamin 2000 IU",
            defaults={
                "description": "Skelet sog'lig'i",
                "category": cat,
                "category_type": Product.ProductCategory.VITAMINS,
                "price": Decimal("120000"),
                "stock_qty": 200,
                "min_stock_alert": 10,
                "contraindications": "",
            },
        )
        p2, _ = Product.objects.get_or_create(
            name="Magniy B6",
            defaults={
                "description": "Asab tizimi",
                "category": cat,
                "category_type": Product.ProductCategory.MINERALS,
                "price": Decimal("85000"),
                "stock_qty": 150,
                "min_stock_alert": 10,
                "contraindications": "",
            },
        )

        c, _ = Customer.objects.get_or_create(
            full_name="Test Mijoz",
            defaults={
                "phones": ["+998901112233"],
                "region": "Toshkent shahri",
                "district": "Chilonzor",
                "allergies": "",
            },
        )

        doc = User.objects.get(username="vrach")
        rx, rx_created = Prescription.objects.get_or_create(
            number="RX0000000001",
            defaults={
                "customer": c,
                "doctor": doc,
                "diagnosis": "Vitamin yetishmovchiligi",
                "status": Prescription.Status.SENT,
                "signed_at": timezone.now(),
                "e_sign_payload": "demo",
            },
        )
        if rx_created:
            PrescriptionItem.objects.create(
                prescription=rx, product=p1, quantity=2, times_per_day=1, duration_days=30
            )
            PrescriptionItem.objects.create(
                prescription=rx, product=p2, quantity=1, times_per_day=2, duration_days=14
            )
            self.stdout.write(self.style.SUCCESS("Namuna retsept yaratildi."))

        self.stdout.write(self.style.SUCCESS("Tayyor."))
