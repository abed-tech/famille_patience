"""Services de présence et finalisation à la clôture d'événement."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from apps.events.models import Event, EventStatus
from apps.members.models import Member, MemberStatus
from .models import Attendance, EventAgentAssignment

User = get_user_model()


class AttendanceScanError(Exception):
    """Erreur métier lors d'un scan de présence."""

    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


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


def open_events_today():
    """Événements / séances ouverts pour la date du jour (fuseau local)."""
    today = timezone.localdate()
    return Event.objects.filter(status=EventStatus.OPEN, date=today).order_by("time", "name")


def get_scannable_event(event_id=None, *, agent=None, require_agent_assignment=False):
    """
    Résout l'événement ouvert du jour pour le pointage.
    Si event_id est omis et qu'un seul événement du jour est ouvert (et assigné),
    il est sélectionné automatiquement.
    """
    today = timezone.localdate()
    qs = Event.objects.filter(status=EventStatus.OPEN, date=today)

    if require_agent_assignment and agent:
        qs = qs.filter(
            agent_assignments__agent=agent,
            agent_assignments__is_active=True,
        ).distinct()

    if event_id:
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist as exc:
            raise AttendanceScanError("Événement introuvable.", 404) from exc
        if event.status != EventStatus.OPEN:
            raise AttendanceScanError("Événement fermé. Le pointage n'est plus possible.")
        if event.date != today:
            raise AttendanceScanError(
                "Le pointage n'est autorisé que pour l'événement ou la séance du jour."
            )
        if require_agent_assignment and agent:
            if not qs.filter(pk=event.pk).exists():
                raise AttendanceScanError(
                    "Vous n'êtes pas autorisé à pointer pour cet événement.",
                    403,
                )
        return event

    count = qs.count()
    if count == 0:
        raise AttendanceScanError(
            "Aucun événement ouvert aujourd'hui. Impossible d'enregistrer la présence."
        )
    if count > 1:
        raise AttendanceScanError(
            "Plusieurs événements ouverts aujourd'hui. Indiquez l'événement concerné."
        )
    return qs.first()


def resolve_member_from_scan_value(scan_value, *, qr_only=False):
    """
    Résout un membre depuis une valeur scannée.
    Mode QR (qr_only=True) : uniquement le code QR unique (insensible à la casse).
    Mode manuel : QR, numéro membre, ou téléphone.
    """
    value = (scan_value or "").strip()
    if not value:
        return None

    member = Member.objects.filter(qr_code__iexact=value, status=MemberStatus.ACTIVE).first()
    if member or qr_only:
        return member

    member = Member.objects.filter(member_number__iexact=value, status=MemberStatus.ACTIVE).first()
    if member:
        return member

    phone = value.replace(" ", "")
    return Member.objects.filter(
        Q(phone_primary__icontains=phone) | Q(phone_secondary__icontains=phone),
        status=MemberStatus.ACTIVE,
    ).first()


def record_attendance(event, member, scanned_by, scan_mode=Attendance.ScanMode.QR):
    """
    Enregistre une présence pour l'événement du jour.
    Le premier scan conserve l'agent et l'horodatage d'origine (non écrasés).
    """
    from apps.members.models import MemberHistory

    now = timezone.now()
    attendance, created = Attendance.objects.get_or_create(
        event=event,
        member=member,
        defaults={
            "scanned_by": scanned_by,
            "is_present": True,
            "scanned_at": now,
            "scan_mode": scan_mode,
        },
    )

    if not created:
        if attendance.is_present:
            return attendance, False
        # Était marqué absent → nouveau pointage
        Attendance.objects.filter(pk=attendance.pk).update(
            scanned_by=scanned_by,
            is_present=True,
            scanned_at=now,
            scan_mode=scan_mode,
        )
        attendance.refresh_from_db()
        created = True

    if created:
        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.EVENT_ATTENDANCE,
            description=f"Présence enregistrée — {event.name}",
            performed_by=scanned_by,
            metadata={
                "event_id": str(event.id),
                "event_name": event.name,
                "scanned_by": str(scanned_by.pk) if scanned_by else None,
                "scanned_at": now.isoformat(),
                "scan_mode": scan_mode,
            },
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
