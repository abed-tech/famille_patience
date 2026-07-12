from django.contrib.auth import get_user_model

from .models import Notification

User = get_user_model()


def create_notification(title, message, notification_type, recipient=None, metadata=None):
    """Crée une notification pour un utilisateur ou tous les admins."""
    if recipient:
        Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            metadata=metadata or {},
        )
    else:
        admins = User.objects.filter(role="admin", is_active=True)
        notifications = [
            Notification(
                recipient=admin,
                title=title,
                message=message,
                notification_type=notification_type,
                metadata=metadata or {},
            )
            for admin in admins
        ]
        Notification.objects.bulk_create(notifications)


def notify_referrers_of_member_absences(event):
    """
    À la clôture d'un événement : notifie chaque référent dont
    au moins un membre assigné était absent.
    """
    from apps.attendance.models import Attendance

    absences = (
        Attendance.objects.filter(event=event, is_present=False)
        .select_related("member", "member__referrer")
        .filter(
            member__referrer__isnull=False,
            member__referrer__is_active=True,
        )
    )

    by_referrer = {}
    for att in absences:
        referrer = att.member.referrer
        bucket = by_referrer.setdefault(referrer.id, {"referrer": referrer, "members": []})
        bucket["members"].append(att.member)

    if not by_referrer:
        return 0

    event_date = event.date.strftime("%d/%m/%Y") if event.date else ""
    date_suffix = f" du {event_date}" if event_date else ""
    notified = 0

    for data in by_referrer.values():
        referrer = data["referrer"]
        members = data["members"]
        count = len(members)

        if count == 1:
            member = members[0]
            title = "Absence à un événement"
            message = (
                f"{member.full_name} était absent(e) à « {event.name} »{date_suffix}."
            )
        else:
            names = ", ".join(m.full_name for m in members[:5])
            if count > 5:
                names += f" et {count - 5} autre(s)"
            title = f"{count} absences — {event.name}"
            message = (
                f"{count} membres de votre suivi étaient absents à « {event.name} »"
                f"{date_suffix} : {names}."
            )

        create_notification(
            title=title,
            message=message,
            notification_type="member_absence",
            recipient=referrer,
            metadata={
                "event_id": str(event.id),
                "event_name": event.name,
                "event_date": str(event.date) if event.date else None,
                "member_ids": [str(m.id) for m in members],
                "member_names": [m.full_name for m in members],
                "absent_count": count,
            },
        )
        notified += 1

    return notified
