from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import User


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            User.Role.ADMIN,
            User.Role.MANAGER,
        )


class ReadOnlyUnlessManagerAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in (User.Role.ADMIN, User.Role.MANAGER)


class CustomerMedicalAccess(BasePermission):
    """Tibbiy to'liq ma'lumot — faqat admin va vrach."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in (User.Role.ADMIN, User.Role.DOCTOR)


def role_at_least(user, roles: tuple):
    return user.is_authenticated and user.role in roles


class RolePermission(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in self.allowed_roles


class IsDoctor(RolePermission):
    allowed_roles = (User.Role.ADMIN, User.Role.MANAGER, User.Role.DOCTOR)


class IsPharmacist(RolePermission):
    allowed_roles = (User.Role.ADMIN, User.Role.MANAGER, User.Role.PHARMACIST)


class IsOperator(RolePermission):
    allowed_roles = (User.Role.ADMIN, User.Role.OPERATOR, User.Role.MANAGER)


class CanManageCatalog(RolePermission):
    allowed_roles = (User.Role.ADMIN, User.Role.MANAGER)


class CanViewReports(RolePermission):
    allowed_roles = (
        User.Role.ADMIN,
        User.Role.MANAGER,
        User.Role.DOCTOR,
        User.Role.PHARMACIST,
        User.Role.OPERATOR,
    )
