from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        MANAGER = "manager", "Menejer"
        DOCTOR = "doctor", "Vrach"
        PHARMACIST = "pharmacist", "Aptekachi"
        OPERATOR = "operator", "Operator"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.OPERATOR)
    phone = models.CharField(max_length=32, blank=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])


class Category(TimeStampedModel):
    name = models.CharField(max_length=128)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    class ProductCategory(models.TextChoices):
        VITAMINS = "vitamins", "Vitaminlar"
        MINERALS = "minerals", "Minerallar"
        PLANTS = "plants", "O'simlik ekstraktlari"
        PROBIOTICS = "probiotics", "Probiotiklar"
        OTHER = "other", "Boshqa"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category_type = models.CharField(
        max_length=32, choices=ProductCategory.choices, default=ProductCategory.OTHER
    )
    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="products"
    )
    price = models.DecimalField(max_digits=14, decimal_places=2)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    composition = models.TextField(blank=True)
    usage_instructions = models.TextField(blank=True)
    contraindications = models.TextField(blank=True)
    min_age = models.PositiveSmallIntegerField(default=0)
    stock_qty = models.PositiveIntegerField(default=0)
    min_stock_alert = models.PositiveIntegerField(default=5)
    expiry_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.name


class Customer(TimeStampedModel):
    full_name = models.CharField(max_length=255)
    phones = models.JSONField(default=list)
    region = models.CharField(max_length=128, blank=True)
    district = models.CharField(max_length=128, blank=True)
    street = models.CharField(max_length=255, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=16, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    allergies = models.TextField(blank=True)
    contraindications = models.TextField(blank=True)
    health_notes = models.TextField(blank=True)
    last_call_at = models.DateTimeField(null=True, blank=True)
    telegram_chat_id = models.CharField(max_length=64, blank=True)
    assigned_operator = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_customers",
        limit_choices_to={"role": User.Role.OPERATOR},
    )

    class Meta:
        indexes = [
            models.Index(fields=["full_name"]),
            models.Index(fields=["deleted_at"]),
        ]

    def __str__(self):
        return self.full_name


class Prescription(TimeStampedModel):
    class Status(models.TextChoices):
        CREATED = "created", "Yaratilgan"
        SENT = "sent", "Aptekachiga yuborilgan"
        PARTIAL = "partial", "Qisman sotilgan"
        SOLD = "sold", "To'liq sotilgan"
        CANCELLED = "cancelled", "Bekor qilingan"

    number = models.CharField(max_length=32, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="prescriptions")
    doctor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="prescriptions_authored",
        limit_choices_to={"role": User.Role.DOCTOR},
    )
    diagnosis = models.TextField(blank=True)
    general_notes = models.TextField(blank=True)
    warnings = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    e_sign_payload = models.TextField(blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.number


class PrescriptionItem(TimeStampedModel):
    prescription = models.ForeignKey(
        Prescription, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    times_per_day = models.PositiveSmallIntegerField(default=1)
    duration_days = models.PositiveSmallIntegerField(default=30)
    instructions = models.TextField(blank=True)
    fulfilled_qty = models.PositiveIntegerField(default=0)

    def remaining(self):
        return max(0, self.quantity - self.fulfilled_qty)


class Sale(TimeStampedModel):
    prescription = models.ForeignKey(
        Prescription, null=True, blank=True, on_delete=models.SET_NULL, related_name="sales"
    )
    pharmacist = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="sales_made",
        limit_choices_to={"role": User.Role.PHARMACIST},
    )
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]


class SaleItem(TimeStampedModel):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)


class CallLog(TimeStampedModel):
    class Result(models.TextChoices):
        TO_DOCTOR = "to_doctor", "Muvaffaqiyatli — vrachga yo'naltirildi"
        REPEAT_RX = "repeat_rx", "Muvaffaqiyatli — takroriy retsept"
        CALLBACK = "callback", "Qayta qo'ng'iroq — sana belgilandi"
        REFUSED = "refused", "Rad etdi"
        NO_ANSWER = "no_answer", "Javob bermadi"
        WRONG_NUMBER = "wrong_number", "Raqam noto'g'ri"

    operator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="call_logs",
        limit_choices_to={"role": User.Role.OPERATOR},
    )
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="call_logs")
    result = models.CharField(max_length=32, choices=Result.choices)
    notes = models.TextField(blank=True)
    duration_sec = models.PositiveIntegerField(default=0)
    scheduled_at = models.DateTimeField(null=True, blank=True)


class Promotion(TimeStampedModel):
    class PromoType(models.TextChoices):
        PERCENT = "percent", "Foizli chegirma"
        ONE_PLUS_ONE = "one_plus_one", "1+1"
        BUNDLE = "bundle", "To'plam"
        LOYAL = "loyal", "Takroriy xaridor"

    name = models.CharField(max_length=255)
    promo_type = models.CharField(max_length=32, choices=PromoType.choices)
    percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    products = models.ManyToManyField(Product, blank=True, related_name="promotions")
    is_active = models.BooleanField(default=True)

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.ends_at <= self.starts_at:
            raise ValidationError("Tugash sanasi boshlanishdan keyin bo'lishi kerak.")

    def __str__(self):
        return self.name


class InventoryMovement(TimeStampedModel):
    class MovementType(models.TextChoices):
        IN = "in", "Kirim"
        OUT = "out", "Chiqim"
        RETURN = "return", "Qaytarish"
        WRITE_OFF = "write_off", "Hisobdan chiqarish"

    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.IntegerField()
    batch_number = models.CharField(max_length=64, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)


class Notification(TimeStampedModel):
    class Channel(models.TextChoices):
        WEB = "web", "Web"
        TELEGRAM = "telegram", "Telegram"

    recipient = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, null=True, blank=True, on_delete=models.CASCADE)
    channel = models.CharField(max_length=16, choices=Channel.choices, default=Channel.WEB)
    title = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    delivery_status = models.CharField(max_length=32, default="pending")


class AuditLog(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=64)
    object_type = models.CharField(max_length=64, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    payload = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


def generate_prescription_number():
    import random
    import string

    return "RX" + "".join(random.choices(string.digits, k=10))
