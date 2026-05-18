from django.db.models import Avg, Count, F, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .jwt_serializers import LockedTokenObtainPairSerializer
from .models import (
    AuditLog,
    CallLog,
    Category,
    Customer,
    InventoryMovement,
    Notification,
    Prescription,
    Product,
    Promotion,
    Sale,
    SaleItem,
    User,
)
from .permissions import (
    CanManageCatalog,
    CanViewReports,
    CustomerMedicalAccess,
    IsAdmin,
    IsDoctor,
    IsManagerOrAdmin,
    IsOperator,
    IsPharmacist,
)
from .serializers import (
    AuditLogSerializer,
    CallLogSerializer,
    CategorySerializer,
    CustomerListSerializer,
    CustomerSerializer,
    InventoryMovementSerializer,
    NotificationSerializer,
    PrescriptionSerializer,
    ProductSerializer,
    PromotionSerializer,
    SaleCreateSerializer,
    SaleSerializer,
    UserSerializer,
    UserWriteSerializer,
)
from .utils import write_audit


class LockedTokenView(TokenObtainPairView):
    serializer_class = LockedTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated, CanViewReports]

    def get(self, request):
        today = timezone.localdate()
        now = timezone.now()
        qs_sales = Sale.objects.filter(deleted_at__isnull=True)
        rx_qs = Prescription.objects.filter(deleted_at__isnull=True)
        cust_qs = Customer.objects.filter(deleted_at__isnull=True)
        prod_qs = Product.objects.filter(deleted_at__isnull=True)

        low_stock = prod_qs.filter(stock_qty__lte=F("min_stock_alert")).count()

        # Yaqin muddatli ogohlantirishlar (30 kun ichida)
        from datetime import timedelta
        expiry_threshold = today + timedelta(days=30)
        expiring_soon = prod_qs.filter(
            expiry_date__isnull=False,
            expiry_date__lte=expiry_threshold,
            expiry_date__gte=today,
        ).count()

        data = {
            "today_sales_count": qs_sales.filter(created_at__date=today).count(),
            "today_sales_sum": qs_sales.filter(created_at__date=today).aggregate(
                s=Sum("total_amount")
            )["s"] or 0,
            "open_prescriptions": rx_qs.exclude(
                status__in=[Prescription.Status.SOLD, Prescription.Status.CANCELLED]
            ).count(),
            "customers_total": cust_qs.count(),
            "low_stock_products": low_stock,
            "expiring_soon_products": expiring_soon,
            "unread_notifications": Notification.objects.filter(
                deleted_at__isnull=True,
                is_read=False,
            ).filter(
                Q(recipient=request.user) | Q(recipient__isnull=True)
            ).count(),
        }
        return Response(data)


class ReportsView(APIView):
    """Kengaytirilgan hisobotlar: kunlik/haftalik/oylik, vrach/aptekachi bo'yicha."""
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request):
        from datetime import timedelta, date as date_type
        import calendar

        period = request.query_params.get("period", "today")
        today = timezone.localdate()

        if period == "today":
            date_from = today
            date_to = today
        elif period == "week":
            date_from = today - timedelta(days=today.weekday())
            date_to = today
        elif period == "month":
            date_from = today.replace(day=1)
            date_to = today
        else:
            # ixtiyoriy sana: ?period=custom&from=2026-01-01&to=2026-01-31
            try:
                date_from = date_type.fromisoformat(request.query_params.get("from", str(today)))
                date_to = date_type.fromisoformat(request.query_params.get("to", str(today)))
            except ValueError:
                date_from = date_to = today

        sales_qs = Sale.objects.filter(
            deleted_at__isnull=True,
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
        )

        # Umumiy statistika
        totals = sales_qs.aggregate(
            sales_count=Count("id"),
            sales_sum=Sum("total_amount"),
            discount_sum=Sum("discount_amount"),
            avg_check=Avg("total_amount"),
        )

        # Aptekachi bo'yicha
        by_pharmacist = list(
            sales_qs.values("pharmacist__username", "pharmacist__first_name", "pharmacist__last_name")
            .annotate(count=Count("id"), total=Sum("total_amount"))
            .order_by("-total")
        )

        # Vrach bo'yicha retseptlar
        rx_qs = Prescription.objects.filter(
            deleted_at__isnull=True,
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
        )
        by_doctor = list(
            rx_qs.values("doctor__username", "doctor__first_name", "doctor__last_name")
            .annotate(
                prescriptions=Count("id"),
                sold=Count("id", filter=Q(status=Prescription.Status.SOLD)),
            )
            .order_by("-prescriptions")
        )

        # Eng ko'p sotiladigan mahsulotlar
        top_products = list(
            SaleItem.objects.filter(
                sale__deleted_at__isnull=True,
                sale__created_at__date__gte=date_from,
                sale__created_at__date__lte=date_to,
            )
            .values("product__name")
            .annotate(qty=Sum("quantity"), revenue=Sum("line_total"))
            .order_by("-qty")[:10]
        )

        # Operator konversiyasi
        call_qs = CallLog.objects.filter(
            deleted_at__isnull=True,
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
        )
        operator_stats = list(
            call_qs.values("operator__username")
            .annotate(
                total_calls=Count("id"),
                to_doctor=Count("id", filter=Q(result=CallLog.Result.TO_DOCTOR)),
                repeat_rx=Count("id", filter=Q(result=CallLog.Result.REPEAT_RX)),
                refused=Count("id", filter=Q(result=CallLog.Result.REFUSED)),
            )
            .order_by("-total_calls")
        )

        # Kunlik savdo (grafik uchun)
        daily_sales = list(
            sales_qs.extra(select={"day": "DATE(created_at)"})
            .values("day")
            .annotate(count=Count("id"), total=Sum("total_amount"))
            .order_by("day")
        )

        # Mijozlar segmentatsiyasi
        thirty_days_ago = today - timedelta(days=30)
        ninety_days_ago = today - timedelta(days=90)
        new_customers = Customer.objects.filter(
            deleted_at__isnull=True,
            created_at__date__gte=thirty_days_ago,
        ).count()
        active_customers = Customer.objects.filter(
            deleted_at__isnull=True,
            prescriptions__created_at__date__gte=thirty_days_ago,
        ).distinct().count()

        return Response({
            "period": {"from": str(date_from), "to": str(date_to)},
            "totals": totals,
            "by_pharmacist": by_pharmacist,
            "by_doctor": by_doctor,
            "top_products": top_products,
            "operator_stats": operator_stats,
            "daily_sales": daily_sales,
            "customers": {
                "new_last_30_days": new_customers,
                "active_last_30_days": active_customers,
            },
        })


class ExpiryAlertView(APIView):
    """Yaqin muddatli va past qoldiqli mahsulotlar ro'yxati."""
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request):
        from datetime import timedelta
        today = timezone.localdate()
        days = int(request.query_params.get("days", 30))
        threshold = today + timedelta(days=days)

        expiring = Product.objects.filter(
            deleted_at__isnull=True,
            expiry_date__isnull=False,
            expiry_date__lte=threshold,
            expiry_date__gte=today,
        ).values("id", "name", "stock_qty", "expiry_date", "min_stock_alert")

        low_stock = Product.objects.filter(
            deleted_at__isnull=True,
            stock_qty__lte=F("min_stock_alert"),
        ).values("id", "name", "stock_qty", "min_stock_alert", "expiry_date")

        return Response({
            "expiring_within_days": days,
            "expiring_products": list(expiring),
            "low_stock_products": list(low_stock),
        })


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserWriteSerializer
        return UserSerializer

    def perform_create(self, serializer):
        u = serializer.save()
        write_audit(self.request.user, "user_create", "User", u.id, {"username": u.username})

    def perform_update(self, serializer):
        u = serializer.save()
        write_audit(self.request.user, "user_update", "User", u.id, {"username": u.username})

    def perform_destroy(self, instance):
        write_audit(self.request.user, "user_delete", "User", instance.id, {"username": instance.username})
        instance.delete()


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(deleted_at__isnull=True)
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanManageCatalog()]

    def perform_create(self, serializer):
        obj = serializer.save()
        write_audit(self.request.user, "category_create", "Category", obj.id, {"name": obj.name})

    def perform_update(self, serializer):
        obj = serializer.save()
        write_audit(self.request.user, "category_update", "Category", obj.id, {"name": obj.name})

    def perform_destroy(self, instance):
        write_audit(self.request.user, "category_delete", "Category", instance.id, {"name": instance.name})
        instance.soft_delete()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(deleted_at__isnull=True)
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanManageCatalog()]

    def perform_create(self, serializer):
        obj = serializer.save()
        write_audit(self.request.user, "product_create", "Product", obj.id, {"name": obj.name})

    def perform_update(self, serializer):
        obj = serializer.save()
        write_audit(self.request.user, "product_update", "Product", obj.id, {"name": obj.name})

    def perform_destroy(self, instance):
        instance.soft_delete()
        write_audit(self.request.user, "product_soft_delete", "Product", instance.id, {"name": instance.name})


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.filter(deleted_at__isnull=True)
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        perms = [IsAuthenticated()]
        if self.action in ("retrieve", "update", "partial_update"):
            perms.append(CustomerMedicalAccess())
        return perms

    def get_serializer_class(self):
        if self.action == "list":
            return CustomerListSerializer
        return CustomerSerializer

    def perform_create(self, serializer):
        c = serializer.save()
        write_audit(self.request.user, "customer_create", "Customer", c.id, {"full_name": c.full_name})

    def perform_update(self, serializer):
        c = serializer.save()
        write_audit(self.request.user, "customer_update", "Customer", c.id, {"full_name": c.full_name})

    def perform_destroy(self, instance):
        if self.request.user.role not in (User.Role.ADMIN, User.Role.MANAGER):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Faqat administrator yoki menejer o'chira oladi.")
        instance.soft_delete()
        write_audit(self.request.user, "customer_soft_delete", "Customer", instance.id, {"full_name": instance.full_name})


class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.filter(deleted_at__isnull=True).select_related(
        "customer", "doctor"
    ).prefetch_related("items__product")
    serializer_class = PrescriptionSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsDoctor()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == User.Role.DOCTOR:
            return qs.filter(doctor=self.request.user)
        return qs

    def perform_create(self, serializer):
        rx = serializer.save()
        write_audit(self.request.user, "prescription_create", "Prescription", rx.id, {"number": rx.number})
        Notification.objects.create(
            title="Yangi retsept",
            body=f"Retsept {rx.number} yaratildi.",
            recipient=None,
            customer=rx.customer,
            channel=Notification.Channel.WEB,
        )

    def perform_update(self, serializer):
        rx = serializer.save()
        write_audit(self.request.user, "prescription_update", "Prescription", rx.id, {"number": rx.number})

    def perform_destroy(self, instance):
        instance.soft_delete()
        write_audit(self.request.user, "prescription_soft_delete", "Prescription", instance.id, {"number": instance.number})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsDoctor])
    def cancel(self, request, pk=None):
        rx = self.get_object()
        if rx.status in (Prescription.Status.SOLD, Prescription.Status.CANCELLED):
            return Response(
                {"detail": "Bu retseptni bekor qilib bo'lmaydi."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rx.status = Prescription.Status.CANCELLED
        rx.save(update_fields=["status", "updated_at"])
        write_audit(request.user, "prescription_cancel", "Prescription", rx.id, {"number": rx.number})
        return Response({"status": rx.status})


class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sale.objects.filter(deleted_at__isnull=True).select_related(
        "customer", "pharmacist", "prescription"
    )
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated, IsPharmacist])
    def complete(self, request):
        ser = SaleCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        sale = ser.save()
        write_audit(request.user, "sale_create", "Sale", sale.id, {
            "total_amount": str(sale.total_amount),
            "discount_amount": str(sale.discount_amount),
        })
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class CallLogViewSet(viewsets.ModelViewSet):
    queryset = CallLog.objects.filter(deleted_at__isnull=True)
    serializer_class = CallLogSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOperator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == User.Role.OPERATOR:
            return qs.filter(operator=self.request.user)
        return qs

    def perform_create(self, serializer):
        log = serializer.save(operator=self.request.user)
        Customer.objects.filter(pk=log.customer_id).update(last_call_at=log.created_at)
        write_audit(self.request.user, "call_log_create", "CallLog", log.id, {"result": log.result})

    def perform_update(self, serializer):
        log = serializer.save()
        write_audit(self.request.user, "call_log_update", "CallLog", log.id, {"result": log.result})

    def perform_destroy(self, instance):
        write_audit(self.request.user, "call_log_delete", "CallLog", instance.id, {})
        instance.soft_delete()


class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.filter(deleted_at__isnull=True)
    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def perform_create(self, serializer):
        obj = serializer.save()
        write_audit(self.request.user, "promotion_create", "Promotion", obj.id, {"name": obj.name})

    def perform_update(self, serializer):
        obj = serializer.save()
        write_audit(self.request.user, "promotion_update", "Promotion", obj.id, {"name": obj.name})

    def perform_destroy(self, instance):
        write_audit(self.request.user, "promotion_delete", "Promotion", instance.id, {"name": instance.name})
        instance.soft_delete()


class InventoryMovementViewSet(viewsets.ModelViewSet):
    queryset = InventoryMovement.objects.filter(deleted_at__isnull=True)
    serializer_class = InventoryMovementSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def perform_create(self, serializer):
        mov = serializer.save(created_by=self.request.user)
        p = mov.product
        if mov.movement_type == InventoryMovement.MovementType.IN:
            p.stock_qty += abs(mov.quantity)
        elif mov.movement_type in (
            InventoryMovement.MovementType.OUT,
            InventoryMovement.MovementType.WRITE_OFF,
        ):
            p.stock_qty = max(0, p.stock_qty - abs(mov.quantity))
        elif mov.movement_type == InventoryMovement.MovementType.RETURN:
            p.stock_qty += abs(mov.quantity)
        p.save(update_fields=["stock_qty", "updated_at"])
        write_audit(self.request.user, "inventory_move", "InventoryMovement", mov.id, {
            "product": p.name,
            "type": mov.movement_type,
            "qty": mov.quantity,
        })

        # Minimal qoldiq ogohlantirishi
        if p.stock_qty <= p.min_stock_alert:
            Notification.objects.get_or_create(
                title=f"Kam qoldiq: {p.name}",
                is_read=False,
                delivery_status="pending",
                defaults={
                    "body": f"{p.name} qoldig'i {p.stock_qty} ta — minimal chegaradan past ({p.min_stock_alert}).",
                    "recipient": None,
                    "channel": Notification.Channel.WEB,
                },
            )


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        return Notification.objects.filter(deleted_at__isnull=True).filter(
            Q(recipient=u) | Q(recipient__isnull=True)
        )

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"is_read": True})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        u = request.user
        updated = Notification.objects.filter(
            deleted_at__isnull=True,
            is_read=False,
        ).filter(
            Q(recipient=u) | Q(recipient__isnull=True)
        ).update(is_read=True)
        return Response({"marked_read": updated})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
