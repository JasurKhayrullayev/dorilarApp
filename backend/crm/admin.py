from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

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
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (("CRM", {"fields": ("role", "phone")}),)
    list_display = ("username", "email", "role", "is_staff")


admin.site.register(Category)
admin.site.register(Product)
admin.site.register(Customer)
admin.site.register(Prescription)
admin.site.register(PrescriptionItem)
admin.site.register(Sale)
admin.site.register(SaleItem)
admin.site.register(CallLog)
admin.site.register(Promotion)
admin.site.register(InventoryMovement)
admin.site.register(Notification)
admin.site.register(AuditLog)
