"""Services API pour l'application Conseiller."""
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from apps.members.models import Member, MemberStatus
from apps.events.models import Event, EventStatus
from apps.attendance.models import Attendance
from apps.accounts.models import User

from .staff_services import (
    attendance_rate,
    group_attendance_rate,
    serialize_member_brief,
)


def _counsellor_members(user, active_only=False):
    qs = Member.objects.filter(counsellor=user).select_related("referrer", "family_pole")
    if active_only:
        qs = qs.filter(status=MemberStatus.ACTIVE)
    return qs


def _scan_mode_label(attendance):
    from apps.attendance.services import scan_mode_label
    return scan_mode_label(attendance)


def get_counsellor_full_dashboard(request, user):
    members_qs = _counsellor_members(user)
    active_qs = members_qs.filter(status=MemberStatus.ACTIVE)
    today = timezone.now().date()

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
            "phone": ref.phone,
            "members_count": ref_members.count(),
            "avg_attendance_rate": group_attendance_rate(ref_members),
        })

    open_events = Event.objects.filter(status=EventStatus.OPEN).count()
    upcoming_events = list(
        Event.objects.filter(status=EventStatus.OPEN, date__gte=today)
        .order_by("date", "time")[:5]
        .values("id", "name", "date", "time", "location", "status")
    )
    for e in upcoming_events:
        e["id"] = str(e["id"])
        if e.get("time"):
            e["time"] = str(e["time"])[:5]

    present_today = 0
    absent_today = 0
    today_event = Event.objects.filter(date=today).exclude(status=EventStatus.DRAFT).first()
    if today_event:
        member_ids = set(active_qs.values_list("id", flat=True))
        present_ids = set(
            Attendance.objects.filter(
                event=today_event, member_id__in=member_ids, is_present=True
            ).values_list("member_id", flat=True)
        )
        present_today = len(present_ids)
        absent_today = max(len(member_ids) - present_today, 0)

    chart_referrers = [
        {"label": r["full_name"].split()[0], "value": r["members_count"]}
        for r in referrer_list
    ]
    chart_attendance_ref = [
        {"label": r["full_name"].split()[0], "value": r["avg_attendance_rate"]}
        for r in referrer_list
    ]

    evolution = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        day_events = Event.objects.filter(date=day).exclude(status=EventStatus.DRAFT)
        if not day_events.exists():
            evolution.append({"label": day.strftime("%d/%m"), "value": 0})
            continue
        mids = list(active_qs.values_list("id", flat=True))
        att = Attendance.objects.filter(event__in=day_events, member_id__in=mids, is_present=True).count()
        expected = len(mids) * day_events.count()
        rate = round((att / expected) * 100) if expected else 0
        evolution.append({"label": day.strftime("%d/%m"), "value": rate})

    recent_events = Event.objects.exclude(status=EventStatus.DRAFT).order_by("-date")[:6]
    chart_event_present = []
    chart_event_absent = []
    mids = list(active_qs.values_list("id", flat=True))
    for ev in recent_events:
        att = Attendance.objects.filter(event=ev, member_id__in=mids)
        p = att.filter(is_present=True).count()
        chart_event_present.append({"label": ev.name[:12], "value": p})
        chart_event_absent.append({"label": ev.name[:12], "value": max(len(mids) - p, 0)})

    distribution = [
        {"label": r["full_name"], "value": r["members_count"]}
        for r in referrer_list
    ]

    return {
        "stats": {
            "total_referrers": len(referrer_list),
            "total_members": active_qs.count(),
            "avg_attendance_rate": group_attendance_rate(active_qs),
            "open_events": open_events,
            "present_today": present_today,
            "absent_today": absent_today,
        },
        "upcoming_events": upcoming_events,
        "referrers": referrer_list,
        "charts": {
            "attendance_evolution": evolution,
            "present_by_event": chart_event_present,
            "absent_by_event": chart_event_absent,
            "members_by_referrer": chart_referrers,
            "attendance_by_referrer": chart_attendance_ref,
            "distribution_by_referrer": distribution,
        },
    }


def get_counsellor_referrer_full(request, user, referrer_id):
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
    qr_code = None
    try:
        mp = referrer.member_profile
        qr_code = mp.qr_code
    except Exception:
        pass

    events_count = (
        Attendance.objects.filter(member__in=members_qs, is_present=True)
        .values("event")
        .distinct()
        .count()
    )

    return {
        "referrer": {
            "id": str(referrer.id),
            "full_name": referrer.full_name,
            "photo": photo,
            "phone": referrer.phone,
            "email": referrer.email,
            "qr_code": qr_code,
            "members_count": members_qs.count(),
            "avg_attendance_rate": group_attendance_rate(members_qs),
            "events_count": events_count,
        },
        "members": [serialize_member_brief(request, m) for m in members_qs],
    }


def get_counsellor_events(user):
    today = timezone.now().date()
    events = Event.objects.exclude(status=EventStatus.DRAFT).order_by("-date", "-time")
    active_members = _counsellor_members(user, active_only=True)
    mids = list(active_members.values_list("id", flat=True))

    result = []
    for ev in events:
        att = Attendance.objects.filter(event=ev, member_id__in=mids)
        present = att.filter(is_present=True).count()
        result.append({
            "id": str(ev.id),
            "name": ev.name,
            "date": ev.date.isoformat(),
            "time": str(ev.time)[:5] if ev.time else None,
            "location": ev.location,
            "status": ev.status,
            "is_upcoming": ev.date >= today and ev.status == EventStatus.OPEN,
            "present_count": present,
            "absent_count": max(len(mids) - present, 0),
            "total_members": len(mids),
        })
    return result


def get_counsellor_event_attendance(request, user, event_id):
    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return None

    members_qs = _counsellor_members(user, active_only=True).select_related("referrer")
    mids = list(members_qs.values_list("id", flat=True))

    present_qs = (
        Attendance.objects.filter(event=event, member_id__in=mids, is_present=True)
        .select_related("member", "member__referrer", "scanned_by")
    )
    present_ids = set(present_qs.values_list("member_id", flat=True))

    present = []
    for att in present_qs:
        m = att.member
        photo = request.build_absolute_uri(m.photo.url) if m.photo else None
        ref = m.referrer
        present.append({
            "member_id": str(m.id),
            "full_name": m.full_name,
            "photo": photo,
            "referrer_name": ref.full_name if ref else "—",
            "referrer_id": str(ref.id) if ref else None,
            "scanned_at": att.scanned_at.isoformat(),
            "scan_mode": _scan_mode_label(att),
        })

    absent = []
    for m in members_qs.exclude(id__in=present_ids):
        photo = request.build_absolute_uri(m.photo.url) if m.photo else None
        absent.append({
            "member_id": str(m.id),
            "full_name": m.full_name,
            "photo": photo,
            "referrer_name": m.referrer.full_name if m.referrer else "—",
            "referrer_id": str(m.referrer_id) if m.referrer_id else None,
        })

    return {
        "event": {
            "id": str(event.id),
            "name": event.name,
            "date": event.date.isoformat(),
            "time": str(event.time)[:5] if event.time else None,
            "location": event.location,
            "status": event.status,
        },
        "present": present,
        "absent": absent,
        "stats": {
            "present_count": len(present),
            "absent_count": len(absent),
            "total": len(mids),
        },
    }
