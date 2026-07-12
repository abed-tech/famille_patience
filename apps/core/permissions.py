from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Accès réservé aux administrateurs."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsCounsellor(BasePermission):
    """Accès réservé aux conseillers."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "counsellor"
        )


class IsReferrer(BasePermission):
    """Accès réservé aux référents."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "referrer"
        )


from apps.members.utils import user_has_member_profile


class IsMember(BasePermission):
    """Accès au profil membre (tout utilisateur lié à un Member)."""

    def has_permission(self, request, view):
        return user_has_member_profile(request.user)


class IsAttendanceAgent(BasePermission):
    """Agent de pointage : affectation active sur un événement ouvert (pas un rôle permanent)."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        from apps.attendance.agent_utils import user_has_active_assignment
        return user_has_active_assignment(request.user)


class IsAdminOrCounsellor(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "counsellor")
        )


class IsAdminOrReferrer(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "referrer")
        )


class IsStaffRole(BasePermission):
    """Administrateur, conseiller ou référent."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "counsellor", "referrer")
        )
