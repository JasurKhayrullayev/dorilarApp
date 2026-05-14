from django.db.models import F, Q, Sum
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
    User,
)
from .permissions import (
    CanManageCatalog,
    CanViewReports,
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
        qs_sales = Sale.objects.filter(deleted_at__isnull=True)
        rx_qs = Prescription.objects.filter(deleted_at__isnull=True)
        cust_qs = Customer.objects.filter(deleted_at__isnull=True)
        low_stock = (
            Product.objects.filter(deleted_at__isnull=True)
            .filter(stock_qty__lte=F("min_stock_alert"))
            .count()
        )
        data = {
            "today_sales_count": qs_sales.filter(created_at__date=today).count(),
            "today_sales_sum": qs_sales.filter(created_at__date=today).aggregate(
                s=Sum("total_amount")
            )["s"]
            or 0,
            "open_prescriptions": rx_qs.exclude(
                status__in=[
                    Prescription.Status.SOLD,
                    Prescription.Status.CANCELLED,
                ]
            ).count(),
            "customers_total": cust_qs.count(),
            "low_stock_products": low_stock,
        }
        return Response(data)


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
        write_audit(self.request.user, "user_update", "User", u.id, {})


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(deleted_at__isnull=True)
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated]
        return [IsAuthenticated(), CanManageCatalog]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(deleted_at__isnull=True)
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated]
        return [IsAuthenticated(), CanManageCatalog]

    def perform_destroy(self, instance):
        instance.soft_delete()
        write_audit(self.request.user, "product_soft_delete", "Product", instance.id, {})


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.filter(deleted_at__isnull=True)
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return CustomerListSerializer
        return CustomerSerializer

    def perform_create(self, serializer):
        c = serializer.save()
        write_audit(self.request.user, "customer_create", "Customer", c.id, {})

    def perform_update(self, serializer):
        c = serializer.save()
        write_audit(self.request.user, "customer_update", "Customer", c.id, {})

    def perform_destroy(self, instance):
        if self.request.user.role not in (User.Role.ADMIN, User.Role.MANAGER):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Faqat administrator yoki menejer o'chira oladi.")
        instance.soft_delete()
        write_audit(self.request.user, "customer_soft_delete", "Customer", instance.id, {})


class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.filter(deleted_at__isnull=True).select_related(
        "customer", "doctor"
    ).prefetch_related("items__product")
    serializer_class = PrescriptionSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsDoctor]
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
        )

    def perform_update(self, serializer):
        rx = serializer.save()
        write_audit(self.request.user, "prescription_update", "Prescription", rx.id, {"number": rx.number})

    def perform_destroy(self, instance):
        instance.soft_delete()
        write_audit(self.request.user, "prescription_soft_delete", "Prescription", instance.id, {})


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
        write_audit(request.user, "sale_create", "Sale", sale.id, {})
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class CallLogViewSet(viewsets.ModelViewSet):
    queryset = CallLog.objects.filter(deleted_at__isnull=True)
    serializer_class = CallLogSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOperator]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == User.Role.OPERATOR:
            return qs.filter(operator=self.request.user)
        return qs

    def perform_create(self, serializer):
        log = serializer.save(operator=self.request.user)
        Customer.objects.filter(pk=log.customer_id).update(last_call_at=log.created_at)
        write_audit(self.request.user, "call_log_create", "CallLog", log.id, {})


class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.filter(deleted_at__isnull=True)
    serializer_class = PromotionSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]


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
        write_audit(self.request.user, "inventory_move", "InventoryMovement", mov.id, {})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        return Notification.objects.filter(deleted_at__isnull=True).filter(
            Q(recipient=u) | Q(recipient__isnull=True)
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
