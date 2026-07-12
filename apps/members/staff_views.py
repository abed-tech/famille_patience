from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsStaffRole
from apps.members.models import MemberHistory
from apps.members.views import MemberQuerysetMixin
from apps.members.staff_serializers import StaffMemberDetailSerializer
from apps.members.serializers import MemberHistorySerializer


class StaffMemberDetailView(MemberQuerysetMixin, APIResponseMixin, APIView):
    """Fiche membre en lecture seule pour référent / conseiller."""

    permission_classes = [IsStaffRole]

    def get(self, request, pk):
        member = get_object_or_404(self.get_queryset(), pk=pk)
        data = StaffMemberDetailSerializer(member, context={"request": request}).data
        return self.success_response(data)


class StaffMemberHistoryView(MemberQuerysetMixin, APIResponseMixin, APIView):
    permission_classes = [IsStaffRole]

    def get(self, request, pk):
        member = get_object_or_404(self.get_queryset(), pk=pk)
        history = MemberHistory.objects.filter(member=member).select_related("performed_by")[:30]
        serializer = MemberHistorySerializer(history, many=True)
        return self.success_response(serializer.data)
