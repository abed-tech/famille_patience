"""Services statistiques pour référents et conseillers."""
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from apps.members.models import Member, MemberStatus, MemberHistory
from apps.events.models import Event, EventStatus
from apps.attendance.models import Attendance
from apps.accounts.models import User


def attendance_rate(member):
    qs = Attendance.objects.filter(member=member)
    total = qs.count()
    if not total:
        return 0
    return round(qs.filter(is_present=True).count() / total * 100)


def group_attendance_rate(members_qs):
    member_ids = list(members_qs.values_list("id", flat=True))
    if not member_ids:
        return 0
    qs = Attendance.objects.filter(member_id__in=member_ids)
    total = qs.count()
    if not total:
        return 0
    return round(qs.filter(is_present=True).count() / total * 100)


def last_event_attendance(members_qs):
    last_event = (
        Event.objects.exclude(status=EventStatus.DRAFT)
        .order_by("-date", "-time")
        .first()
    )
    if not last_event:
        return {"event": None, "present": 0, "absent": 0, "total": members_qs.count()}

    member_ids = set(members_qs.values_list("id", flat=True))
    attendances = Attendance.objects.filter(event=last_event, member_id__in=member_ids)
    present_ids = set(attendances.filter(is_present=True).values_list("member_id", flat=True))
    present = len(present_ids)
    total = len(member_ids)
    return {
        "event": {"id": str(last_event.id), "name": last_event.name, "date": last_event.date.isoformat()},
        "present": present,
        "absent": max(total - present, 0),
        "total": total,
    }


def serialize_member_brief(request, member):
    photo = None
    if member.photo:
        photo = request.build_absolute_uri(member.photo.url)
    return {
        "id": str(member.id),
        "full_name": member.full_name,
        "member_number": member.member_number,
        "photo": photo,
        "status": member.status,
        "attendance_rate": attendance_rate(member),
        "phone_primary": member.phone_primary,
    }


def get_referrer_dashboard(request, user):
    members_qs = Member.objects.filter(referrer=user).select_related(
        "family_pole", "church_department"
    )
    active = members_qs.filter(status=MemberStatus.ACTIVE)
    last_evt = last_event_attendance(active)
    recent_members = active.order_by("-registration_date")[:5]
    recent_history = (
        MemberHistory.objects.filter(member__referrer=user)
        .select_related("member")
        .order_by("-created_at")[:8]
    )

    status_counts = (
        members_qs.values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )

    members_with_rates = [serialize_member_brief(request, m) for m in active[:50]]
    chart_attendance = sorted(
        [{"label": m["full_name"].split()[0], "value": m["attendance_rate"]} for m in members_with_rates],
        key=lambda x: x["value"],
        reverse=True,
    )[:10]

    return {
        "stats": {
            "total_members": members_qs.count(),
            "active_members": active.count(),
            "present_last_event": last_evt["present"],
            "absent_last_event": last_evt["absent"],
            "avg_attendance_rate": group_attendance_rate(active),
            "last_event": last_evt["event"],
        },
        "members": members_with_rates,
        "recent_registrations": [serialize_member_brief(request, m) for m in recent_members],
        "recent_activity": [
            {
                "description": h.description,
                "member_name": h.member.full_name,
                "datetime": h.created_at.isoformat(),
            }
            for h in recent_history
        ],
        "charts": {
            "attendance": chart_attendance,
            "status": [{"label": s["status"], "value": s["count"]} for s in status_counts],
        },
    }


def get_counsellor_dashboard(request, user):
    members_qs = Member.objects.filter(counsellor=user)
    referrer_ids = (
        members_qs.filter(referrer__isnull=False)
        .values_list("referrer_id", flat=True)
        .distinct()
    )
    referrers = User.objects.filter(id__in=referrer_ids, role="referrer")
    referrer_list = []
    for ref in referrers:
        ref_members = members_qs.filter(referrer=ref)
        photo = request.build_absolute_uri(ref.avatar.url) if ref.avatar else None
        referrer_list.append({
            "id": str(ref.id),
            "full_name": ref.full_name,
            "photo": photo,
            "members_count": ref_members.count(),
            "avg_attendance_rate": group_attendance_rate(ref_members),
        })

    return {
        "stats": {
            "total_members": members_qs.filter(status=MemberStatus.ACTIVE).count(),
            "total_referrers": len(referrer_list),
            "avg_attendance_rate": group_attendance_rate(members_qs),
        },
        "referrers": referrer_list,
    }


def get_counsellor_referrer_detail(request, user, referrer_id):
    try:
        referrer = User.objects.get(pk=referrer_id, role="referrer")
    except User.DoesNotExist:
        return None

    members_qs = Member.objects.filter(counsellor=user, referrer=referrer).select_related(
        "family_pole", "church_department"
    )
    if not members_qs.exists():
        return None

    photo = request.build_absolute_uri(referrer.avatar.url) if referrer.avatar else None
    return {
        "referrer": {
            "id": str(referrer.id),
            "full_name": referrer.full_name,
            "photo": photo,
            "email": referrer.email,
            "phone": referrer.phone,
            "members_count": members_qs.count(),
            "avg_attendance_rate": group_attendance_rate(members_qs),
        },
        "members": [serialize_member_brief(request, m) for m in members_qs],
    }
