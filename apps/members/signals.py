import uuid

from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Member, MemberHistory


def generate_member_number():
    """Génère un numéro de membre unique."""
    return f"FP-{uuid.uuid4().hex[:8].upper()}"


def generate_qr_code():
    """Génère un code QR unique."""
    return f"FPQR-{uuid.uuid4().hex}"


@receiver(pre_save, sender=Member)
def delete_old_member_photo(sender, instance, **kwargs):
    """Supprime l'ancienne photo (Cloudinary ou disque) lors d'un remplacement."""
    if not instance.pk:
        return
    try:
        old = Member.objects.get(pk=instance.pk)
    except Member.DoesNotExist:
        return
    if old.photo and old.photo != instance.photo:
        try:
            old.photo.delete(save=False)
        except Exception:
            pass


@receiver(pre_save, sender=Member)
def set_member_identifiers(sender, instance, **kwargs):
    if not instance.member_number:
        instance.member_number = generate_member_number()
    if not instance.qr_code:
        instance.qr_code = generate_qr_code()


@receiver(pre_save, sender=Member)
def track_member_changes(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old = Member.objects.get(pk=instance.pk)
    except Member.DoesNotExist:
        return

    if old.status != instance.status:
        MemberHistory.objects.create(
            member=instance,
            action_type=MemberHistory.ActionType.STATUS_CHANGED,
            description=f"Statut changé de {old.get_status_display()} à {instance.get_status_display()}",
            metadata={"old_status": old.status, "new_status": instance.status},
        )

    assignment_fields = ["referrer_id", "counsellor_id", "family_pole_id"]
    changes = {}
    for field in assignment_fields:
        old_val = getattr(old, field)
        new_val = getattr(instance, field)
        if old_val != new_val:
            changes[field] = {"old": str(old_val) if old_val else None, "new": str(new_val) if new_val else None}

    if changes:
        MemberHistory.objects.create(
            member=instance,
            action_type=MemberHistory.ActionType.ASSIGNMENT,
            description="Modification des affectations",
            metadata=changes,
        )
