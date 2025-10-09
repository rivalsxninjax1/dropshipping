from __future__ import annotations

from typing import Iterable

from django.contrib.auth import get_user_model
from rest_framework.permissions import SAFE_METHODS, BasePermission


User = get_user_model()


def user_has_role(user, roles: Iterable[str]) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    role = getattr(user, "role", None)
    # Fallback to staff flag for legacy data where role may be missing
    if not role and getattr(user, "is_staff", False):
        role = User.Role.STAFF
    return role in set(roles)


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return user_has_role(request.user, {User.Role.ADMIN})


class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = getattr(obj, "user", None)
        return bool(user and request.user and user == request.user)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return user_has_role(request.user, {User.Role.ADMIN})

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsStaff(BasePermission):
    """Allow access to admin + staff roles."""

    def has_permission(self, request, view):
        return user_has_role(request.user, {User.Role.ADMIN, User.Role.STAFF})

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsVendor(BasePermission):
    """Allow access to vendor role (and admins)."""

    def has_permission(self, request, view):
        return user_has_role(request.user, {User.Role.ADMIN, User.Role.VENDOR})

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsStaffOrVendor(BasePermission):
    """Allow access to admin, staff and vendor roles."""

    def has_permission(self, request, view):
        return user_has_role(request.user, {User.Role.ADMIN, User.Role.STAFF, User.Role.VENDOR})

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
