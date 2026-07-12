"""Nettoyage des autorisations lors d'un changement de rôle utilisateur."""

from apps.members.utils import user_has_member_profile


def apply_role_transition(user, old_role, new_role):
    """
    Révoque les autorisations staff lorsqu'un référent ou conseiller est rétrogradé.

    - Désassigne les membres supervisés (référent / conseiller)
    - Retire les auto-affectations sur le profil membre (self-referrer / self-counsellor)
    - Désactive les affectations agent de pointage si perte du statut staff
    """
    from apps.members.models import Member
    from apps.attendance.models import EventAgentAssignment

    cleanup = {
        "unassigned_as_referrer": 0,
        "unassigned_as_counsellor": 0,
        "agent_assignments_deactivated": 0,
    }

    if old_role == new_role:
        return cleanup

    staff_roles = {"referrer", "counsellor"}
    losing_staff = old_role in staff_roles and new_role not in staff_roles
    losing_referrer = old_role == "referrer" and new_role != "referrer"
    losing_counsellor = old_role == "counsellor" and new_role != "counsellor"

    if losing_referrer:
        cleanup["unassigned_as_referrer"] = Member.objects.filter(referrer=user).update(referrer=None)

    if losing_counsellor:
        cleanup["unassigned_as_counsellor"] = Member.objects.filter(counsellor=user).update(counsellor=None)

    if losing_staff:
        cleanup["agent_assignments_deactivated"] = (
            EventAgentAssignment.objects.filter(agent=user, is_active=True).update(is_active=False)
        )

    return cleanup


def apply_member_role_profile(user, new_role):
    """Met à jour les auto-affectations du profil membre après promotion."""
    if not user_has_member_profile(user):
        return

    from apps.members.models import Member

    member = user.member_profile
    update_fields = []

    if new_role == "referrer":
        member.referrer = user
        update_fields.append("referrer")
    elif new_role == "counsellor":
        member.counsellor = user
        update_fields.append("counsellor")

    if update_fields:
        update_fields.append("updated_at")
        member.save(update_fields=update_fields)


def format_role_cleanup_message(cleanup, new_role, old_role):
    """Message lisible pour l'administrateur après rétrogradation."""
    if new_role != "member" or old_role not in ("referrer", "counsellor"):
        return ""

    parts = []
    if cleanup.get("unassigned_as_referrer"):
        parts.append(f"{cleanup['unassigned_as_referrer']} membre(s) désassigné(s)")
    if cleanup.get("unassigned_as_counsellor"):
        parts.append(f"{cleanup['unassigned_as_counsellor']} supervision(s) retirée(s)")
    if cleanup.get("agent_assignments_deactivated"):
        parts.append(f"{cleanup['agent_assignments_deactivated']} affectation(s) pointage désactivée(s)")

    if parts:
        return " Autorisations révoquées : " + ", ".join(parts) + "."
    return " Toutes les autorisations staff ont été révoquées."
