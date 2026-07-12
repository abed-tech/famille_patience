"""Services de présence et finalisation à la clôture d'événement."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.members.models import Member, MemberStatus
from .models import Attendance, EventAgentAssignment

User = get_user_model()


def assign_attendance_agent(event, agent, assigned_by):
    """Assigne un agent de pointage à un événement."""
    max_agents = getattr(settings, "MAX_ATTENDANCE_AGENTS_PER_EVENT", 5)
    current_count = EventAgentAssignment.objects.filter(event=event, is_active=True).count()

    if current_count >= max_agents:
        raise ValueError(f"Maximum {max_agents} agents par événement.")

    assignment, created = EventAgentAssignment.objects.get_or_create(
        event=event,
        agent=agent,
        defaults={"assigned_by": assigned_by, "is_active": True},
    )

    if not created:
        assignment.is_active = True
        assignment.save(update_fields=["is_active", "updated_at"])

    return assignment


def revoke_event_agents(event):
    """Révoque tous les agents d'un événement fermé (sans modifier le rôle utilisateur)."""
    EventAgentAssignment.objects.filter(event=event, is_active=True).update(is_active=False)


def record_attendance(event, member, scanned_by, scan_mode=Attendance.ScanMode.QR):
    """Enregistre une présence et met à jour l'historique."""
    from apps.members.models import MemberHistory

    attendance, created = Attendance.objects.update_or_create(
        event=event,
        member=member,
        defaults={
            "scanned_by": scanned_by,
            "is_present": True,
            "scanned_at": timezone.now(),
            "scan_mode": scan_mode,
        },
    )

    if created:
        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.EVENT_ATTENDANCE,
            description=f"Présence enregistrée — {event.name}",
            performed_by=scanned_by,
            metadata={"event_id": str(event.id), "event_name": event.name},
        )

    return attendance, created


def finalize_event_attendance(event):
    """
    À la clôture : marque automatiquement absents tous les membres actifs
    qui n'ont pas été scannés ou enregistrés manuellement.
    Notifie les référents concernés.
    """
    from apps.members.models import MemberHistory
    from apps.notifications.services import notify_referrers_of_member_absences

    active_members = Member.objects.filter(status=MemberStatus.ACTIVE)
    present_ids = set(
        Attendance.objects.filter(event=event, is_present=True).values_list("member_id", flat=True)
    )

    now = timezone.now()
    absent_count = 0
    for member in active_members:
        if member.id in present_ids:
            continue
        Attendance.objects.update_or_create(
            event=event,
            member=member,
            defaults={
                "is_present": False,
                "scanned_at": now,
                "scanned_by": None,
                "scan_mode": None,
            },
        )
        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.EVENT_ABSENCE,
            description=f"Absent — {event.name}",
            performed_by=None,
            metadata={"event_id": str(event.id), "event_name": event.name},
        )
        absent_count += 1

    notify_referrers_of_member_absences(event)

    return {
        "total_expected": active_members.count(),
        "present_count": len(present_ids),
        "absent_count": absent_count,
    }


def scan_mode_label(attendance):
    if attendance.scan_mode == Attendance.ScanMode.QR:
        return "QR Code"
    if attendance.scan_mode == Attendance.ScanMode.MANUAL:
        return "Manuel"
    if attendance.scanned_by and attendance.scanned_by.role == "admin":
        return "Manuel"
    return "QR Code"
