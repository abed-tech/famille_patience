from datetime import date

from django.db.models import Q
from django.utils import timezone

from apps.events.models import Event, EventStatus
from apps.attendance.models import Attendance
from apps.attendance.agent_utils import get_user_active_assignments
from apps.notifications.models import Notification
from .models import Member, MemberHistory, MemberStatus


def _photo_url(request, image_field):
    if image_field and hasattr(image_field, "url"):
        return request.build_absolute_uri(image_field.url)
    return None


def get_member_dashboard(request, member):
    today = timezone.now().date()
    attendances = Attendance.objects.filter(member=member).select_related("event")
    present_count = attendances.filter(is_present=True).count()
    total_tracked = attendances.count()
    rate = round((present_count / total_tracked) * 100) if total_tracked else 0

    participated_ids = attendances.filter(is_present=True).values_list("event_id", flat=True)
    events_attended = len(set(participated_ids))

    closed_events = Event.objects.exclude(status=EventStatus.DRAFT).filter(
        Q(status=EventStatus.CLOSED) | Q(date__lt=today)
    )
    total_events = closed_events.count()

    next_event = (
        Event.objects.filter(status=EventStatus.OPEN, date__gte=today)
        .order_by("date", "time")
        .first()
    )

    last_history = (
        MemberHistory.objects.filter(member=member).order_by("-created_at").first()
    )
    last_scan = attendances.order_by("-scanned_at").first()

    referrer_data = None
    if member.referrer:
        ref = member.referrer
        referrer_data = {
            "full_name": ref.full_name,
            "photo": _photo_url(request, ref.avatar),
        }

    counsellor_data = None
    if request.user.role == "referrer" and member.counsellor:
        c = member.counsellor
        counsellor_data = {
            "full_name": c.full_name,
            "photo": _photo_url(request, c.avatar),
        }

    unread = Notification.objects.filter(recipient=request.user, is_read=False).count()

    active_agent_events = []
    for a in get_user_active_assignments(request.user):
        ev = a.event
        present = ev.attendances.filter(is_present=True).count()
        expected = Member.objects.filter(status=MemberStatus.ACTIVE).count()
        active_agent_events.append({
            "event_id": str(ev.id),
            "name": ev.name,
            "date": ev.date.isoformat(),
            "time": str(ev.time)[:5] if ev.time else None,
            "location": ev.location,
            "present_count": present,
            "expected_count": expected,
        })

    return {
        "profile": {
            "first_name": member.first_name,
            "full_name": member.full_name,
            "member_number": member.member_number,
            "photo": _photo_url(request, member.photo),
        },
        "referrer": referrer_data,
        "counsellor": counsellor_data,
        "user_role": request.user.role,
        "stats": {
            "attendance_rate": rate,
            "events_attended": events_attended,
            "total_events": total_events,
            "unread_notifications": unread,
        },
        "next_event": (
            {
                "id": str(next_event.id),
                "name": next_event.name,
                "date": next_event.date.isoformat(),
                "time": str(next_event.time)[:5] if next_event.time else None,
                "location": next_event.location,
            }
            if next_event
            else None
        ),
        "active_agent_events": active_agent_events,
        "has_agent_access": len(active_agent_events) > 0,
        "last_activity": (
            {
                "description": last_scan.event.name if last_scan else last_history.description,
                "datetime": (
                    last_scan.scanned_at.isoformat()
                    if last_scan
                    else last_history.created_at.isoformat()
                ),
                "type": "attendance" if last_scan else "history",
            }
            if last_scan or last_history
            else None
        ),
    }


def get_member_events(request, member):
    today = timezone.now().date()
    events = Event.objects.exclude(status=EventStatus.DRAFT).order_by("-date", "-time")
    attendance_map = {
        a.event_id: a
        for a in Attendance.objects.filter(member=member).select_related("event")
    }

    def serialize_event(ev):
        att = attendance_map.get(ev.id)
        return {
            "id": str(ev.id),
            "name": ev.name,
            "date": ev.date.isoformat(),
            "time": str(ev.time)[:5] if ev.time else None,
            "location": ev.location,
            "description": ev.description,
            "status": ev.status,
            "attendance": (
                {
                    "is_present": att.is_present,
                    "scanned_at": att.scanned_at.isoformat(),
                }
                if att
                else None
            ),
        }

    upcoming = []
    past = []
    participated = []

    for ev in events:
        data = serialize_event(ev)
        is_past = ev.date < today or ev.status == EventStatus.CLOSED
        if ev.id in attendance_map and attendance_map[ev.id].is_present:
            participated.append(data)
        if is_past:
            past.append(data)
        elif ev.date >= today and ev.status == EventStatus.OPEN:
            upcoming.append(data)

    return {
        "upcoming": upcoming,
        "past": past,
        "participated": participated,
        "stats": {
            "attendance_rate": _attendance_rate(member),
            "total_participated": len(participated),
            "total_events": len(past) + len(upcoming),
        },
    }


def get_member_event_detail(request, user, event_id):
    """Détail événement pour tout membre ; stats agent si affecté."""
    from apps.attendance.agent_utils import user_has_active_assignment, user_was_assigned_to_event
    from apps.attendance.models import Attendance
    from apps.attendance.serializers import AttendanceSerializer

    try:
        event = Event.objects.exclude(status=EventStatus.DRAFT).get(pk=event_id)
    except Event.DoesNotExist:
        return None

    member = user.member_profile
    att = Attendance.objects.filter(member=member, event=event).first()

    event_data = {
        "id": str(event.id),
        "name": event.name,
        "description": event.description,
        "date": event.date.isoformat(),
        "time": str(event.time)[:5] if event.time else None,
        "location": event.location,
        "status": event.status,
    }

    attendance_data = None
    if att:
        attendance_data = {
            "is_present": att.is_present,
            "scanned_at": att.scanned_at.isoformat() if att.scanned_at else None,
        }

    is_agent = user_was_assigned_to_event(user, event_id)
    can_record = user_has_active_assignment(user, event_id=event_id)

    result = {
        "event": event_data,
        "attendance": attendance_data,
        "can_record_attendance": can_record,
        "is_agent": is_agent,
    }

    if is_agent:
        expected = Member.objects.filter(status=MemberStatus.ACTIVE).count()
        present = Attendance.objects.filter(event=event, is_present=True).count()
        attendances = (
            Attendance.objects.filter(event=event, is_present=True)
            .select_related("member", "scanned_by")
            .order_by("-scanned_at")
        )
        result["present_count"] = present
        result["expected_count"] = expected
        result["attendances"] = AttendanceSerializer(attendances, many=True).data

    return result


def _attendance_rate(member):
    qs = Attendance.objects.filter(member=member)
    total = qs.count()
    if not total:
        return 0
    present = qs.filter(is_present=True).count()
    return round((present / total) * 100)
