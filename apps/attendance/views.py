from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsAdmin
from apps.events.models import Event, EventStatus
from apps.members.models import Member
from .models import Attendance
from .serializers import AttendanceSerializer, ScanQRSerializer, AssignAgentSerializer
from .services import (
    AttendanceScanError,
    assign_attendance_agent,
    get_scannable_event,
    record_attendance,
    resolve_member_from_scan_value,
)
from .agent_utils import user_has_active_assignment

User = get_user_model()


def _resolve_agent_user(validated_data):
    member_id = validated_data.get("member_id")
    agent_id = validated_data.get("agent_id")
    if member_id:
        member = Member.objects.select_related("user").get(pk=member_id)
        if not member.user:
            raise ValueError("Ce membre n'a pas de compte utilisateur.")
        return member.user
    return User.objects.get(pk=agent_id)


def broadcast_attendance(event_id, attendance_data):
    """Diffuse une mise à jour de présence en temps réel."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"event_{event_id}",
            {"type": "attendance.update", "data": attendance_data},
        )


def _process_scan(request, *, require_agent_assignment):
    """Logique commune agent / admin pour enregistrer une présence."""
    serializer = ScanQRSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    qr_code = serializer.validated_data["qr_code"]
    event_id = serializer.validated_data.get("event_id")
    mode = serializer.validated_data.get("scan_mode", "qr")
    qr_only = mode == "qr"

    event = get_scannable_event(
        event_id,
        agent=request.user if require_agent_assignment else None,
        require_agent_assignment=require_agent_assignment,
    )

    member = resolve_member_from_scan_value(qr_code, qr_only=qr_only)
    if not member:
        raise AttendanceScanError(
            "QR code invalide ou membre inactif." if qr_only
            else "Membre introuvable (QR, numéro ou téléphone).",
            404,
        )

    scan_mode = Attendance.ScanMode.MANUAL if mode == "manual" else Attendance.ScanMode.QR
    attendance, created = record_attendance(
        event, member, request.user, scan_mode=scan_mode
    )
    data = AttendanceSerializer(attendance).data
    data["member_name"] = member.full_name
    data["event_name"] = event.name
    data["agent_name"] = request.user.full_name
    broadcast_attendance(str(event.id), data)

    if created:
        message = "Présence enregistrée."
    else:
        message = "Présence déjà enregistrée pour cet événement."
    return data, message


class AssignAgentView(APIResponseMixin, generics.GenericAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AssignAgentSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return Event.objects.all()

    def post(self, request, pk):
        event = self.get_object()
        if event.status != EventStatus.OPEN:
            return self.error_response("Les agents ne peuvent être assignés qu'à un événement ouvert.")

        serializer = AssignAgentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            agent = _resolve_agent_user(serializer.validated_data)
        except Member.DoesNotExist:
            return self.error_response("Membre introuvable.", status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return self.error_response("Agent introuvable.", status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return self.error_response(str(e))

        try:
            assign_attendance_agent(event, agent, request.user)
        except ValueError as e:
            return self.error_response(str(e))

        return self.success_response(message=f"Agent {agent.full_name} assigné.")


class ScanQRView(APIResponseMixin, generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ScanQRSerializer

    def post(self, request):
        if not user_has_active_assignment(request.user):
            return self.error_response(
                "Vous n'êtes pas autorisé à pointer (aucune affectation active).",
                status.HTTP_403_FORBIDDEN,
            )
        try:
            data, message = _process_scan(request, require_agent_assignment=True)
        except AttendanceScanError as exc:
            return self.error_response(exc.message, exc.status_code)
        return self.success_response(data, message)


class AdminScanQRView(APIResponseMixin, generics.GenericAPIView):
    """Scan QR par l'administrateur (page pointage admin)."""

    permission_classes = [IsAdmin]
    serializer_class = ScanQRSerializer

    def post(self, request):
        try:
            data, message = _process_scan(request, require_agent_assignment=False)
        except AttendanceScanError as exc:
            return self.error_response(exc.message, exc.status_code)
        return self.success_response(data, message)


class EventAttendanceListView(APIResponseMixin, generics.ListAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        event_id = self.kwargs["pk"]
        user = self.request.user
        if user.role == "admin":
            pass
        elif not user_has_active_assignment(user, event_id=event_id):
            return Attendance.objects.none()
        return Attendance.objects.filter(event_id=event_id, is_present=True).select_related(
            "member", "scanned_by"
        ).order_by("-scanned_at")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)
