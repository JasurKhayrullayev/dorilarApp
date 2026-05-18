from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import (
    AuditLog,
    CallLog,
    Category,
    Customer,
    InventoryMovement,
    Notification,
    Prescription,
    PrescriptionItem,
    Product,
    Promotion,
    Sale,
    SaleItem,
    User,
    generate_prescription_number,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role", "phone")
        read_only_fields = fields


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "password",
            "is_active",
        )

    def create(self, validated_data):
        pwd = validated_data.pop("password", None)
        user = User(**validated_data)
        if pwd:
            user.set_password(pwd)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        pwd = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if pwd:
            instance.set_password(pwd)
        instance.save()
        return instance


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ("stock_qty",)


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ("last_call_at",)

    def validate_phones(self, value):
        if not value or not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError("Kamida bitta telefon raqami kerak.")
        return value

    def validate(self, attrs):
        phones = attrs.get("phones") or (self.instance.phones if self.instance else None)
        if self.instance is None and phones:
            flat = [str(p).strip() for p in phones]
            qs = Customer.objects.filter(deleted_at__isnull=True)
            for p in flat:
                for c in qs:
                    if p in [str(x).strip() for x in (c.phones or [])]:
                        raise serializers.ValidationError(
                            {"phones": "Bu raqam allaqachon bazada mavjud."}
                        )
        return attrs


class CustomerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            "id",
            "full_name",
            "phones",
            "region",
            "district",
            "last_call_at",
            "assigned_operator",
            "created_at",
        )


class PrescriptionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = (
            "id",
            "product",
            "product_name",
            "quantity",
            "times_per_day",
            "duration_days",
            "instructions",
            "fulfilled_qty",
        )
        read_only_fields = ("fulfilled_qty",)


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = (
            "id",
            "number",
            "customer",
            "customer_name",
            "doctor",
            "doctor_name",
            "diagnosis",
            "general_notes",
            "warnings",
            "follow_up_date",
            "status",
            "e_sign_payload",
            "signed_at",
            "items",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("number", "signed_at", "doctor")

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() or obj.doctor.username

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Mahsulotlar ro'yxati bo'sh bo'lmasin.")
        return value

    def validate(self, attrs):
        items = attrs.get("items", [])
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        if customer and items:
            allergy_text = (customer.allergies or "").lower()
            for it in items:
                prod = None
                if isinstance(it, dict):
                    p = it.get("product")
                    prod = p if isinstance(p, Product) else Product.objects.filter(pk=p).first()
                elif hasattr(it, "product"):
                    prod = it.product
                if prod and allergy_text and prod.name.lower() in allergy_text:
                    raise serializers.ValidationError(
                        {"items": f"Ogohlantirish: {prod.name} allergiya ro'yxatida ko'rinadi."}
                    )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        request = self.context["request"]
        number = generate_prescription_number()
        while Prescription.objects.filter(number=number).exists():
            number = generate_prescription_number()
        rx = Prescription.objects.create(
            **validated_data,
            number=number,
            doctor=request.user,
            status=Prescription.Status.CREATED,
        )
        for row in items_data:
            PrescriptionItem.objects.create(prescription=rx, **row)
        rx.status = Prescription.Status.SENT
        rx.signed_at = timezone.now()
        rx.e_sign_payload = rx.e_sign_payload or "demo-ers-imzo"
        rx.save(update_fields=["status", "signed_at", "e_sign_payload", "updated_at"])
        return rx

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for row in items_data:
                PrescriptionItem.objects.create(prescription=instance, **row)
        return instance


class SaleItemWriteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(deleted_at__isnull=True))
    quantity = serializers.IntegerField(min_value=1)


def _apply_promotions(product, qty, unit_price, customer):
    """
    Faol aksiyalarni tekshirib, chegirma summasini qaytaradi.
    Ustuvorlik: percent > one_plus_one > bundle > loyal.
    """
    from django.utils import timezone as tz
    now = tz.now()
    promos = Promotion.objects.filter(
        is_active=True,
        deleted_at__isnull=True,
        starts_at__lte=now,
        ends_at__gte=now,
        products=product,
    ).order_by("promo_type")

    discount = 0
    for promo in promos:
        if promo.promo_type == Promotion.PromoType.PERCENT and promo.percent:
            discount = unit_price * qty * promo.percent / 100
            break
        elif promo.promo_type == Promotion.PromoType.ONE_PLUS_ONE:
            # Har ikkita uchun bittasi bepul
            free_qty = qty // 2
            discount = unit_price * free_qty
            break
        elif promo.promo_type == Promotion.PromoType.LOYAL:
            # Takroriy xaridor: kamida 1 ta oldingi sotuv bo'lsa
            has_prev = Sale.objects.filter(customer=customer, deleted_at__isnull=True).exists()
            if has_prev and promo.percent:
                discount = unit_price * qty * promo.percent / 100
                break

    return discount


class SaleCreateSerializer(serializers.Serializer):
    prescription = serializers.PrimaryKeyRelatedField(queryset=Prescription.objects.all())
    items = SaleItemWriteSerializer(many=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        rx: Prescription = validated_data["prescription"]
        pharmacist = request.user
        items_in = validated_data["items"]
        customer = rx.customer

        total = 0
        total_discount = 0
        sale_lines = []
        for line in items_in:
            product = line["product"]
            qty = line["quantity"]
            pitem = rx.items.filter(product=product).first()
            if not pitem:
                raise serializers.ValidationError(
                    {"items": f"Retseptda {product.name} yo'q."}
                )
            remaining = pitem.remaining()
            if qty > remaining:
                raise serializers.ValidationError(
                    {"items": f"{product.name}: sotilgan miqdor retseptdan oshmasin."}
                )
            if product.stock_qty < qty:
                raise serializers.ValidationError(
                    {"items": f"{product.name}: omborda yetarli emas."}
                )
            unit_price = product.price
            discount = _apply_promotions(product, qty, unit_price, customer)
            line_total = unit_price * qty - discount
            total += line_total
            total_discount += discount
            sale_lines.append((product, qty, unit_price, line_total, discount, pitem))

        sale = Sale.objects.create(
            prescription=rx,
            pharmacist=pharmacist,
            customer=customer,
            total_amount=total,
            discount_amount=total_discount,
            notes=validated_data.get("notes", ""),
        )
        for product, qty, unit_price, line_total, discount, pitem in sale_lines:
            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=qty,
                unit_price=unit_price,
                line_total=line_total,
            )
            product.stock_qty -= qty
            product.save(update_fields=["stock_qty", "updated_at"])
            InventoryMovement.objects.create(
                product=product,
                movement_type=InventoryMovement.MovementType.OUT,
                quantity=qty,
                created_by=pharmacist,
            )
            pitem.fulfilled_qty += qty
            pitem.save(update_fields=["fulfilled_qty", "updated_at"])

        all_done = all(it.remaining() == 0 for it in rx.items.all())
        any_done = any(it.fulfilled_qty > 0 for it in rx.items.all())
        if all_done:
            rx.status = Prescription.Status.SOLD
        elif any_done:
            rx.status = Prescription.Status.PARTIAL
        rx.save(update_fields=["status", "updated_at"])

        body = f"Sotuv #{sale.id}: {total} so'm."
        if total_discount > 0:
            body += f" Chegirma: {total_discount} so'm."
        Notification.objects.create(
            recipient=None,
            customer=customer,
            title="Sotuv tasdiqlandi",
            body=body,
            channel=Notification.Channel.TELEGRAM,
            delivery_status="pending",
        )
        return sale


class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = "__all__"


class CallLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallLog
        fields = "__all__"
        read_only_fields = ("operator",)

    def validate(self, attrs):
        if not attrs.get("result"):
            raise serializers.ValidationError({"result": "Natija turi tanlanishi shart."})
        return attrs


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = "__all__"

    def validate(self, attrs):
        starts = attrs.get("starts_at") or getattr(self.instance, "starts_at", None)
        ends = attrs.get("ends_at") or getattr(self.instance, "ends_at", None)
        if starts and ends and ends <= starts:
            raise serializers.ValidationError(
                {"ends_at": "Tugash sanasi boshlanishdan keyin bo'lishi kerak."}
            )
        return attrs


class InventoryMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryMovement
        fields = "__all__"
        read_only_fields = ("created_by",)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AuditLog
        fields = ("id", "created_at", "user", "username", "action", "object_type", "object_id", "payload")
