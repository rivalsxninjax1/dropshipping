from rest_framework.permissions import BasePermission, SAFE_METHODS, IsAdminUser


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = getattr(obj, "user", None)
        return bool(user and request.user and user == request.user)


IsAdmin = IsAdminUser


class IsStaffUser(BasePermission):
    """Allow access only to authenticated staff users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
