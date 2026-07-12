"""Services d'analytique pour le tableau de bord administrateur."""
from datetime import timedelta, date

from django.db.models import Count, Q
from django.db.models.functions import TruncMonth, TruncDate, ExtractYear
from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.members.models import Member, MemberStatus, MemberHistory, Gender
from apps.events.models import Event, EventStatus
from apps.attendance.models import Attendance, EventAgentAssignment
from apps.notifications.models import Notification


def _pct_change(current, previous):
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def get_admin_dashboard_data():
    now = timezone.now()
    today = now.date()
    thirty_days_ago = today - timedelta(days=30)
    sixty_days_ago = today - timedelta(days=60)

    members_qs = Member.objects.all()
    users_qs = User.objects.filter(is_active=True)

    total_members = members_qs.count()
    active_members = members_qs.filter(status=MemberStatus.ACTIVE).count()
    suspended_members = members_qs.filter(status=MemberStatus.SUSPENDED).count()
    new_members_30d = members_qs.filter(registration_date__gte=thirty_days_ago).count()
    new_members_prev = members_qs.filter(
        registration_date__gte=sixty_days_ago, registration_date__lt=thirty_days_ago
    ).count()

    referrers_count = users_qs.filter(role=UserRole.REFERRER).count()
    counsellors_count = users_qs.filter(role=UserRole.COUNSELLOR).count()

    events_qs = Event.objects.all()
    total_events = events_qs.count()
    open_events = events_qs.filter(status=EventStatus.OPEN).count()

    today_attendances = Attendance.objects.filter(
        scanned_at__date=today, is_present=True
    ).count()
    today_events = events_qs.filter(date=today)
    expected_today = active_members * today_events.count() if today_events.exists() else 0
    absences_today = max(expected_today - today_attendances, 0)

    month_attendances = Attendance.objects.filter(
        scanned_at__date__gte=thirty_days_ago, is_present=True
    ).count()
    month_events = events_qs.filter(date__gte=thirty_days_ago).count()
    expected_month = active_members * month_events if month_events else 0
    attendance_rate = round((month_attendances / expected_month) * 100, 1) if expected_month else 0

    unread_notifications = Notification.objects.filter(is_read=False).count()

    # Graphiques — inscriptions par mois (6 derniers mois)
    six_months_ago = today - timedelta(days=180)
    registrations_by_month = (
        members_qs.filter(registration_date__gte=six_months_ago)
        .annotate(month=TruncMonth("registration_date"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
    )
    reg_chart = [
        {"label": r["month"].strftime("%b %Y") if r["month"] else "", "value": r["count"]}
        for r in registrations_by_month
    ]

    # Présences par jour (14 derniers jours)
    fourteen_days_ago = today - timedelta(days=14)
    attendances_by_day = (
        Attendance.objects.filter(scanned_at__date__gte=fourteen_days_ago, is_present=True)
        .annotate(day=TruncDate("scanned_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    attendance_chart = [
        {"label": a["day"].strftime("%d/%m") if a["day"] else "", "value": a["count"]}
        for a in attendances_by_day
    ]

    # Genre
    gender_dist = list(
        members_qs.filter(status=MemberStatus.ACTIVE)
        .values("gender")
        .annotate(count=Count("id"))
    )
    gender_chart = [
        {"label": "Féminin" if g["gender"] == "F" else "Masculin", "value": g["count"]}
        for g in gender_dist
    ]

    # Par pôle famille
    pole_dist = list(
        members_qs.filter(status=MemberStatus.ACTIVE, family_pole__isnull=False)
        .values("family_pole__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:8]
    )
    pole_chart = [{"label": p["family_pole__name"], "value": p["count"]} for p in pole_dist]

    # Par département église
    dept_dist = list(
        members_qs.filter(status=MemberStatus.ACTIVE, church_department__isnull=False)
        .values("church_department__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:8]
    )
    dept_chart = [{"label": d["church_department__name"], "value": d["count"]} for d in dept_dist]

    # Événements par mois
    events_by_month = (
        events_qs.filter(date__gte=six_months_ago)
        .annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
    )
    events_chart = [
        {"label": e["month"].strftime("%b %Y") if e["month"] else "", "value": e["count"]}
        for e in events_by_month
    ]

    # Tranches d'âge
    current_year = today.year
    age_buckets = {"18-25": 0, "26-35": 0, "36-45": 0, "46-55": 0, "56+": 0}
    for m in members_qs.filter(status=MemberStatus.ACTIVE).only("date_of_birth"):
        age = current_year - m.date_of_birth.year
        if age <= 25:
            age_buckets["18-25"] += 1
        elif age <= 35:
            age_buckets["26-35"] += 1
        elif age <= 45:
            age_buckets["36-45"] += 1
        elif age <= 55:
            age_buckets["46-55"] += 1
        else:
            age_buckets["56+"] += 1
    age_chart = [{"label": k, "value": v} for k, v in age_buckets.items()]

    # Activité récente
    activity = []

    for m in members_qs.order_by("-created_at")[:5]:
        activity.append({
            "type": "registration",
            "icon": "user-plus",
            "title": m.full_name,
            "description": "Nouvelle inscription",
            "datetime": m.created_at.isoformat(),
        })

    for h in MemberHistory.objects.select_related("member").order_by("-created_at")[:10]:
        activity.append({
            "type": h.action_type,
            "icon": "activity",
            "title": h.member.full_name,
            "description": h.description,
            "datetime": h.created_at.isoformat(),
        })

    for e in events_qs.order_by("-created_at")[:5]:
        activity.append({
            "type": "event",
            "icon": "calendar",
            "title": e.name,
            "description": f"Événement {e.get_status_display().lower()}",
            "datetime": e.created_at.isoformat(),
        })

    activity.sort(key=lambda x: x["datetime"], reverse=True)
    activity = activity[:15]

    recent_scans = list(
        Attendance.objects.filter(is_present=True)
        .select_related("member", "event", "scanned_by")
        .order_by("-scanned_at")[:10]
        .values(
            "member__first_name", "member__last_name", "event__name",
            "scanned_at", "scanned_by__first_name", "scanned_by__last_name",
        )
    )
    for s in recent_scans:
        s["member_name"] = f"{s.pop('member__first_name')} {s.pop('member__last_name')}"
        s["event_name"] = s.pop("event__name")
        s["agent_name"] = f"{s.pop('scanned_by__first_name', '')} {s.pop('scanned_by__last_name', '')}".strip()
        s["scanned_at"] = s["scanned_at"].isoformat()

    return {
        "stats": {
            "total_members": {"value": total_members, "change": _pct_change(new_members_30d, new_members_prev)},
            "new_members": {"value": new_members_30d, "change": _pct_change(new_members_30d, new_members_prev)},
            "active_members": {"value": active_members, "change": 0},
            "suspended_members": {"value": suspended_members, "change": 0},
            "referrers": {"value": referrers_count, "change": 0},
            "counsellors": {"value": counsellors_count, "change": 0},
            "total_events": {"value": total_events, "change": 0},
            "open_events": {"value": open_events, "change": 0},
            "attendances_today": {"value": today_attendances, "change": 0},
            "absences_today": {"value": absences_today, "change": 0},
            "attendance_rate": {"value": attendance_rate, "change": 0},
            "unread_notifications": {"value": unread_notifications, "change": 0},
        },
        "charts": {
            "registrations": reg_chart,
            "attendances": attendance_chart,
            "gender": gender_chart,
            "age": age_chart,
            "poles": pole_chart,
            "departments": dept_chart,
            "events": events_chart,
        },
        "activity": activity,
        "recent_scans": recent_scans,
    }


def get_live_pointage_data():
    """Données temps réel pour la page pointage admin."""
    today = timezone.now().date()
    open_events = Event.objects.filter(status=EventStatus.OPEN)

    agents = list(
        EventAgentAssignment.objects.filter(is_active=True, event__in=open_events)
        .select_related("agent", "event")
        .values(
            "agent__id", "agent__first_name", "agent__last_name",
            "event__id", "event__name",
        )
    )
    for a in agents:
        a["agent_name"] = f"{a.pop('agent__first_name')} {a.pop('agent__last_name')}"
        a["event_id"] = str(a.pop("event__id"))
        a["event_name"] = a.pop("event__name")

    recent = list(
        Attendance.objects.filter(event__in=open_events, is_present=True)
        .select_related("member", "event", "scanned_by")
        .order_by("-scanned_at")[:20]
        .values(
            "member__first_name", "member__last_name", "event__name",
            "scanned_at", "scanned_by__first_name",
        )
    )
    for r in recent:
        r["member_name"] = f"{r.pop('member__first_name')} {r.pop('member__last_name')}"
        r["event_name"] = r.pop("event__name")
        r["agent_name"] = r.pop("scanned_by__first_name", "")
        r["scanned_at"] = r["scanned_at"].isoformat()

    stats = {}
    for event in open_events:
        present = event.attendances.filter(is_present=True).count()
        active_count = Member.objects.filter(status=MemberStatus.ACTIVE).count()
        stats[str(event.id)] = {
            "name": event.name,
            "present": present,
            "absent": max(active_count - present, 0),
            "total_members": active_count,
        }

    return {"agents": agents, "recent_scans": recent, "event_stats": stats}
