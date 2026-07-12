"""Utilitaires d'autorisation agent de pointage.

L'agent pointeur n'est pas une responsabilité permanente : c'est une affectation
temporaire liée à un événement (EventAgentAssignment). Tout membre, référent ou
conseiller avec un compte utilisateur peut être désigné par l'administrateur.
"""

from apps.events.models import EventStatus
from .models import EventAgentAssignment


def user_has_active_assignment(user, event_id=None):
    if not user or not user.is_authenticated:
        return False
    qs = EventAgentAssignment.objects.filter(
        agent=user,
        is_active=True,
        event__status=EventStatus.OPEN,
    )
    if event_id:
        qs = qs.filter(event_id=event_id)
    return qs.exists()


def get_user_active_assignments(user):
    return (
        EventAgentAssignment.objects.filter(
            agent=user,
            is_active=True,
            event__status=EventStatus.OPEN,
        )
        .select_related("event")
        .order_by("event__date", "event__time")
    )


def user_was_assigned_to_event(user, event_id):
    if not user or not user.is_authenticated:
        return False
    return EventAgentAssignment.objects.filter(agent=user, event_id=event_id).exists()


def get_user_assigned_events_list(user):
    """
    Événements assignés à l'agent : ouverts (actifs) en premier, puis fermés.
    Nécessite au moins une affectation active sur un événement ouvert.
    """
    if not user_has_active_assignment(user):
        return {"open": [], "closed": []}

    from apps.members.models import Member, MemberStatus

    open_list = []
    closed_list = []
    seen = set()

    assignments = (
        EventAgentAssignment.objects.filter(agent=user)
        .select_related("event")
        .order_by("-event__date", "-event__time")
    )

    expected = Member.objects.filter(status=MemberStatus.ACTIVE).count()

    for assignment in assignments:
        if assignment.event_id in seen:
            continue
        seen.add(assignment.event_id)
        event = assignment.event
        present = event.attendances.filter(is_present=True).count()
        item = {
            "event_id": str(event.id),
            "name": event.name,
            "date": event.date,
            "time": event.time,
            "location": event.location,
            "status": event.status,
            "can_scan": (
                event.status == EventStatus.OPEN and assignment.is_active
            ),
            "present_count": present,
            "expected_count": expected,
        }
        if event.status == EventStatus.OPEN and assignment.is_active:
            open_list.append(item)
        elif event.status == EventStatus.CLOSED:
            closed_list.append(item)

    open_list.sort(key=lambda x: (x["date"], str(x["time"] or "")))
    closed_list.sort(key=lambda x: (x["date"], str(x["time"] or "")), reverse=True)

    return {"open": open_list, "closed": closed_list}
