from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsAdmin, IsAttendanceAgent
from apps.events.models import Event, EventStatus
from apps.members.models import Member
from .models import Attendance, EventAgentAssignment
from .serializers import AttendanceSerializer, ScanQRSerializer, AssignAgentSerializer
from .services import assign_attendance_agent, record_attendance
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

def resolve_member_from_scan_value(scan_value):
    """
    Résout un membre depuis une valeur scannée ou saisie:
    QR code, numéro membre, téléphone.
    """
    value = (scan_value or "").strip()
    if not value:
        return None

    member = Member.objects.filter(qr_code__iexact=value, status="active").first()
    if member:
        return member

    member = Member.objects.filter(member_number__iexact=value, status="active").first()
    if member:
        return member

    phone = value.replace(" ", "")
    return Member.objects.filter(
        Q(phone_primary__icontains=phone) | Q(phone_secondary__icontains=phone),
        status="active",
    ).first()


def broadcast_attendance(event_id, attendance_data):
    """Diffuse une mise à jour de présence en temps réel."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"event_{event_id}",
            {"type": "attendance.update", "data": attendance_data},
        )


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
        serializer = ScanQRSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        qr_code = serializer.validated_data["qr_code"]
        event_id = serializer.validated_data["event_id"]

        try:
            event = Event.objects.get(pk=event_id, status=EventStatus.OPEN)
        except Event.DoesNotExist:
            return self.error_response("Événement introuvable ou fermé.", status.HTTP_404_NOT_FOUND)

        if not user_has_active_assignment(request.user, event_id=event_id):
            return self.error_response("Vous n'êtes pas autorisé à pointer pour cet événement.", status.HTTP_403_FORBIDDEN)

        member = resolve_member_from_scan_value(qr_code)
        if not member:
            return self.error_response(
                "Membre introuvable (QR, numéro ou téléphone).",
                status.HTTP_404_NOT_FOUND,
            )

        mode = serializer.validated_data.get("scan_mode", "qr")
        scan_mode = Attendance.ScanMode.MANUAL if mode == "manual" else Attendance.ScanMode.QR
        attendance, created = record_attendance(
            event, member, request.user, scan_mode=scan_mode
        )
        data = AttendanceSerializer(attendance).data

        broadcast_attendance(str(event_id), data)

        message = "Présence enregistrée." if created else "Présence déjà enregistrée, mise à jour effectuée."
        return self.success_response(data, message)


class AdminScanQRView(APIResponseMixin, generics.GenericAPIView):
    """Scan QR par l'administrateur (page pointage admin)."""

    permission_classes = [IsAdmin]
    serializer_class = ScanQRSerializer

    def post(self, request):
        serializer = ScanQRSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        qr_code = serializer.validated_data["qr_code"]
        event_id = serializer.validated_data["event_id"]

        try:
            event = Event.objects.get(pk=event_id, status=EventStatus.OPEN)
        except Event.DoesNotExist:
            return self.error_response("Événement introuvable ou fermé.", status.HTTP_404_NOT_FOUND)

        member = resolve_member_from_scan_value(qr_code)
        if not member:
            return self.error_response(
                "Code invalide ou membre inactif (QR ou numéro membre).",
                status.HTTP_404_NOT_FOUND,
            )

        mode = serializer.validated_data.get("scan_mode", "qr")
        scan_mode = Attendance.ScanMode.MANUAL if mode == "manual" else Attendance.ScanMode.QR
        attendance, created = record_attendance(
            event, member, request.user, scan_mode=scan_mode
        )
        data = AttendanceSerializer(attendance).data
        data["member_name"] = member.full_name
        broadcast_attendance(str(event_id), data)

        message = "Présence enregistrée." if created else "Présence déjà enregistrée."
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
