from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsCounsellor
from apps.members.models import Member
from apps.members.staff_serializers import StaffMemberDetailSerializer
from .counsellor_services import (
    get_counsellor_full_dashboard,
    get_counsellor_referrer_full,
    get_counsellor_events,
    get_counsellor_event_attendance,
)


class CounsellorFullDashboardView(APIResponseMixin, APIView):
    permission_classes = [IsCounsellor]

    def get(self, request):
        return self.success_response(get_counsellor_full_dashboard(request, request.user))


class CounsellorReferrersListView(APIResponseMixin, APIView):
    permission_classes = [IsCounsellor]

    def get(self, request):
        data = get_counsellor_full_dashboard(request, request.user)
        return self.success_response(data["referrers"])


class CounsellorReferrerDetailView(APIResponseMixin, APIView):
    permission_classes = [IsCounsellor]

    def get(self, request, pk):
        data = get_counsellor_referrer_full(request, request.user, pk)
        if not data:
            return self.error_response("Référent introuvable ou non affecté.", 404)
        return self.success_response(data)


class CounsellorEventsView(APIResponseMixin, APIView):
    permission_classes = [IsCounsellor]

    def get(self, request):
        return self.success_response(get_counsellor_events(request.user))


class CounsellorEventAttendanceView(APIResponseMixin, APIView):
    permission_classes = [IsCounsellor]

    def get(self, request, pk):
        data = get_counsellor_event_attendance(request, request.user, pk)
        if not data:
            return self.error_response("Événement introuvable.", 404)
        return self.success_response(data)


class CounsellorMemberDetailView(APIResponseMixin, APIView):
    permission_classes = [IsCounsellor]

    def get(self, request, pk):
        member = get_object_or_404(Member.objects.filter(counsellor=request.user), pk=pk)
        data = StaffMemberDetailSerializer(member, context={"request": request}).data
        return self.success_response(data)
