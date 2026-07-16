import secrets
import uuid

from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Member, MemberHistory


def _unique_value(prefix, factory, field_name, max_attempts=12):
    """Génère une valeur unique en base pour le champ donné."""
    for _ in range(max_attempts):
        value = f"{prefix}{factory()}"
        if not Member.objects.filter(**{field_name: value}).exists():
            return value
    raise RuntimeError(f"Impossible de générer un {field_name} unique.")


def generate_member_number():
    """Génère un numéro de membre unique (vérifié en base)."""
    return _unique_value("FP-", lambda: uuid.uuid4().hex[:8].upper(), "member_number")


def generate_qr_code():
    """
    Génère un code QR unique et non devinable.
    Format : FPQR-<32 hex UUID>-<8 hex secrets> — contrainte unique en base.
    """
    return _unique_value(
        "FPQR-",
        lambda: f"{uuid.uuid4().hex}-{secrets.token_hex(4)}",
        "qr_code",
    )


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
    """Attribue numéro et QR une seule fois ; empêche toute réécriture du QR."""
    if instance.pk:
        try:
            existing = Member.objects.only("member_number", "qr_code").get(pk=instance.pk)
        except Member.DoesNotExist:
            existing = None
        if existing:
            if existing.member_number:
                instance.member_number = existing.member_number
            if existing.qr_code:
                instance.qr_code = existing.qr_code

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
