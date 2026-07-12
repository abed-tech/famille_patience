from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsAdmin
from apps.members.models import Member, MemberStatus
from apps.events.models import Event, EventStatus
from apps.attendance.models import Attendance
from apps.dashboard.staff_services import get_referrer_dashboard


class AdminDashboardView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        total_members = Member.objects.filter(status=MemberStatus.ACTIVE).count()
        new_members = Member.objects.filter(registration_date__gte=thirty_days_ago.date()).count()
        total_events = Event.objects.count()
        open_events = Event.objects.filter(status=EventStatus.OPEN).count()

        recent_events = Event.objects.filter(date__gte=thirty_days_ago.date())
        total_attendances = Attendance.objects.filter(
            event__in=recent_events, is_present=True
        ).count()

        expected_attendances = total_members * recent_events.count() if recent_events.count() else 0
        absences = max(expected_attendances - total_attendances, 0)
        attendance_rate = (
            round((total_attendances / expected_attendances) * 100, 1)
            if expected_attendances > 0
            else 0
        )

        members_by_pole = (
            Member.objects.filter(status=MemberStatus.ACTIVE, family_pole__isnull=False)
            .values("family_pole__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        recent_attendances = (
            Attendance.objects.filter(is_present=True)
            .select_related("member", "event")
            .order_by("-scanned_at")[:10]
        )

        data = {
            "summary": {
                "total_members": total_members,
                "new_members_30d": new_members,
                "total_events": total_events,
                "open_events": open_events,
                "attendances_30d": total_attendances,
                "absences_30d": absences,
                "attendance_rate_30d": attendance_rate,
            },
            "members_by_family_pole": list(members_by_pole),
            "recent_attendances": [
                {
                    "member": a.member.full_name,
                    "event": a.event.name,
                    "scanned_at": a.scanned_at.isoformat(),
                }
                for a in recent_attendances
            ],
        }
        return self.success_response(data)


class ReferrerDashboardView(APIResponseMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "referrer":
            return self.error_response("Accès réservé aux référents.", 403)
        return self.success_response(get_referrer_dashboard(request, request.user))
