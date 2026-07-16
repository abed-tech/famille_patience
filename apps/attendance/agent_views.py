from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsAdmin
from apps.members.models import Member, MemberStatus
from apps.events.models import Event, EventStatus
from .models import Attendance, EventAgentAssignment
from .serializers import AttendanceSerializer
from .agent_utils import (
    user_has_active_assignment,
    get_user_active_assignments,
    user_was_assigned_to_event,
    get_user_assigned_events_list,
)


class MyAgentEventsView(APIResponseMixin, APIView):
    """Événements ouverts assignés à l'agent connecté."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not user_has_active_assignment(request.user):
            return self.success_response([])

        data = []
        for a in get_user_active_assignments(request.user):
            event = a.event
            present = event.attendances.filter(is_present=True).count()
            expected = Member.objects.filter(status=MemberStatus.ACTIVE).count()
            data.append({
                "event_id": str(event.id),
                "name": event.name,
                "date": event.date,
                "time": event.time,
                "location": event.location,
                "attendance_count": present,
                "expected_count": expected,
            })
        return self.success_response(data)


class AgentAssignedEventsListView(APIResponseMixin, APIView):
    """Liste des événements assignés (ouverts puis fermés) — section Événements agent."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not user_has_active_assignment(request.user):
            return self.success_response({"open": [], "closed": []})
        return self.success_response(get_user_assigned_events_list(request.user))


class AgentEventDetailView(APIResponseMixin, APIView):
    """Détail d'un événement assigné (pointage si ouvert, consultation si fermé)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not user_was_assigned_to_event(request.user, pk):
            return self.error_response("Vous n'êtes pas autorisé pour cet événement.", status_code=403)

        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return self.error_response("Événement introuvable.", status_code=404)

        can_scan = user_has_active_assignment(request.user, event_id=pk)
        expected = Member.objects.filter(status=MemberStatus.ACTIVE).count()
        present = Attendance.objects.filter(event=event, is_present=True).count()
        attendances = (
            Attendance.objects.filter(event=event, is_present=True)
            .select_related("member", "scanned_by")
            .order_by("-scanned_at")
        )

        return self.success_response({
            "event": {
                "id": str(event.id),
                "name": event.name,
                "description": event.description,
                "date": event.date,
                "time": event.time,
                "location": event.location,
                "status": event.status,
            },
            "can_scan": can_scan,
            "present_count": present,
            "expected_count": expected,
            "attendances": AttendanceSerializer(attendances, many=True).data,
        })


class AgentEventDashboardView(APIResponseMixin, APIView):
    """Statistiques et liste des présences pour un événement assigné."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not user_has_active_assignment(request.user, event_id=pk):
            return self.error_response("Vous n'êtes pas autorisé pour cet événement.", status_code=403)

        try:
            event = Event.objects.get(pk=pk, status=EventStatus.OPEN)
        except Event.DoesNotExist:
            return self.error_response("Événement introuvable ou fermé.", status_code=404)

        expected = Member.objects.filter(status=MemberStatus.ACTIVE).count()
        present = Attendance.objects.filter(event=event, is_present=True).count()
        attendances = (
            Attendance.objects.filter(event=event, is_present=True)
            .select_related("member", "scanned_by")
            .order_by("-scanned_at")
        )

        return self.success_response({
            "event": {
                "id": str(event.id),
                "name": event.name,
                "date": event.date,
                "time": event.time,
                "location": event.location,
            },
            "present_count": present,
            "expected_count": expected,
            "attendances": AttendanceSerializer(attendances, many=True).data,
        })


class AgentMemberSearchView(APIResponseMixin, APIView):
    """Recherche manuelle de membres pour le pointage."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        query = (request.query_params.get("q") or "").strip()

        if not user_has_active_assignment(request.user, event_id=pk):
            return self.error_response("Non autorisé.", status_code=403)
        if len(query) < 2:
            return self.success_response([])

        members = Member.objects.filter(status=MemberStatus.ACTIVE).filter(
            Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(middle_name__icontains=query)
            | Q(member_number__icontains=query)
            | Q(phone_primary__icontains=query)
            | Q(phone_secondary__icontains=query)
        ).order_by("last_name", "first_name")[:15]

        return self.success_response([
            {
                "id": str(m.id),
                "full_name": m.full_name,
                "member_number": m.member_number,
                "phone_primary": m.phone_primary,
            }
            for m in members
        ])
