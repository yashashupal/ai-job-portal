from rest_framework.permissions import BasePermission


class IsHirer(BasePermission):
    message = "Only hirer accounts can do this."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "hirer")


class IsApplicant(BasePermission):
    message = "Only applicant accounts can do this."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "applicant")
