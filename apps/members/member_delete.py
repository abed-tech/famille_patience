"""Suppression définitive et irréversible d'un membre."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction

from apps.members.models import Member

User = get_user_model()


class MemberDeleteError(Exception):
    """Erreur métier lors de la suppression définitive."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _delete_audit_logs(member: Member) -> None:
    try:
        from auditlog.models import LogEntry
        from django.contrib.contenttypes.models import ContentType

        ct = ContentType.objects.get_for_model(Member)
        LogEntry.objects.filter(content_type=ct, object_pk=str(member.pk)).delete()
    except Exception:
        pass


def _delete_member_photo(member: Member) -> None:
    if not member.photo:
        return
    try:
        member.photo.delete(save=False)
    except Exception:
        pass


@transaction.atomic
def permanently_delete_member(member: Member, *, performed_by: User | None = None) -> dict:
    """
    Supprime définitivement le membre et toutes les données liées.

    - Profil membre, historique, présences (CASCADE)
    - Compte utilisateur, notifications, affectations pointage (CASCADE)
    - Photo Cloudinary / stockage
    - Journaux auditlog du profil
    """
    member = Member.objects.select_related("user").get(pk=member.pk)
    user = member.user

    if performed_by and user and user.pk == performed_by.pk:
        raise MemberDeleteError("Vous ne pouvez pas supprimer votre propre compte.")

    if user and (user.role == "admin" or user.is_superuser):
        raise MemberDeleteError("Impossible de supprimer un compte administrateur.")

    summary = {
        "id": str(member.id),
        "full_name": member.full_name,
        "member_number": member.member_number,
        "user_deleted": bool(user),
    }

    _delete_member_photo(member)
    _delete_audit_logs(member)

    if user:
        user.delete()
    else:
        member.delete()

    return summary
