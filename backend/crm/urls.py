from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = DefaultRouter()
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"categories", views.CategoryViewSet, basename="category")
router.register(r"products", views.ProductViewSet, basename="product")
router.register(r"customers", views.CustomerViewSet, basename="customer")
router.register(r"prescriptions", views.PrescriptionViewSet, basename="prescription")
router.register(r"sales", views.SaleViewSet, basename="sale")
router.register(r"calls", views.CallLogViewSet, basename="call")
router.register(r"promotions", views.PromotionViewSet, basename="promotion")
router.register(r"inventory-movements", views.InventoryMovementViewSet, basename="inventory")
router.register(r"notifications", views.NotificationViewSet, basename="notification")
router.register(r"audit-logs", views.AuditLogViewSet, basename="audit")

urlpatterns = [
    path("token/", views.LockedTokenView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("", include(router.urls)),
]
