from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsMember, IsAdmin, IsStaffRole
from apps.attendance.models import Attendance
from .models import Member, MemberHistory, ChurchPole, ChurchDepartment, FamilyPole, Profession
from .member_services import get_member_dashboard, get_member_events, get_member_event_detail
from .serializers import (
    MemberDetailSerializer,
    MemberSelfUpdateSerializer,
    MemberRegistrationSerializer,
    MemberHistorySerializer,
    MemberListSerializer,
    ChurchPoleSerializer,
    ChurchDepartmentSerializer,
    FamilyPoleSerializer,
    ProfessionSerializer,
)


class MemberRegistrationView(APIResponseMixin, generics.CreateAPIView):
    """Inscription publique — Application Membre uniquement."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = MemberRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        try:
            payload = MemberDetailSerializer(member, context={"request": request}).data
        except Exception:
            # Ne jamais transformer une inscription réussie en 500 à cause de la photo
            payload = {
                "id": str(member.id),
                "member_number": member.member_number,
                "email": member.email or getattr(member.user, "email", ""),
                "first_name": member.first_name,
                "last_name": member.last_name,
            }
        return self.created_response(
            payload,
            "Inscription réussie. Vous pouvez vous connecter.",
        )


class MyProfileView(APIResponseMixin, generics.RetrieveUpdateAPIView):
    """Profil du membre connecté (membre, référent ou conseiller avec profil membre)."""

    permission_classes = [IsAuthenticated]

    def get_object(self):
        from apps.members.utils import user_has_member_profile
        if not user_has_member_profile(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Profil membre introuvable.")
        return self.request.user.member_profile

    def retrieve(self, request, *args, **kwargs):
        member = self.get_object()
        data = MemberDetailSerializer(member, context={"request": request}).data
        return self.success_response(data)

    def update(self, request, *args, **kwargs):
        member = self.get_object()
        serializer = MemberSelfUpdateSerializer(
            member, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        data = MemberDetailSerializer(member, context={"request": request}).data
        return self.success_response(data, "Profil mis à jour.")


class MyCardView(APIResponseMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.members.utils import user_has_member_profile
        if not user_has_member_profile(request.user):
            return self.error_response("Profil membre introuvable.", status.HTTP_404_NOT_FOUND)
        member = request.user.member_profile
        role = request.user.role
        role_labels = {"member": "Membre", "referrer": "Référent", "counsellor": "Conseiller", "admin": "Administrateur"}
        data = {
            "member_number": member.member_number,
            "full_name": member.full_name,
            "photo": request.build_absolute_uri(member.photo.url) if member.photo else None,
            "qr_code": member.qr_code,
            "family_pole": member.family_pole.name if member.family_pole else None,
            "church_pole": member.church_pole.name if member.church_pole else None,
            "status": member.status,
            "registration_date": member.registration_date,
            "role": role,
            "role_label": role_labels.get(role, "Membre"),
        }
        return self.success_response(data)


class MyHistoryView(APIResponseMixin, generics.ListAPIView):
    permission_classes = [IsMember]
    serializer_class = MemberHistorySerializer

    def get_queryset(self):
        member = self.request.user.member_profile
        return MemberHistory.objects.filter(member=member).select_related("performed_by")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)


class MyAttendancesView(APIResponseMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.members.utils import user_has_member_profile
        if not user_has_member_profile(request.user):
            return self.error_response("Profil membre introuvable.", status.HTTP_404_NOT_FOUND)
        member = request.user.member_profile
        attendances = (
            Attendance.objects.filter(member=member)
            .select_related("event")
            .order_by("-scanned_at")
        )
        data = [
            {
                "event_id": str(a.event_id),
                "event_name": a.event.name,
                "event_date": a.event.date.isoformat(),
                "event_time": str(a.event.time)[:5] if a.event.time else None,
                "location": a.event.location,
                "is_present": a.is_present,
                "scanned_at": a.scanned_at.isoformat(),
            }
            for a in attendances
        ]
        return self.success_response(data)


class MyDashboardView(APIResponseMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.members.utils import user_has_member_profile
        from apps.dashboard.staff_services import get_referrer_dashboard, get_counsellor_dashboard
        from apps.notifications.models import Notification

        user = request.user

        if user_has_member_profile(user):
            data = get_member_dashboard(request, user.member_profile)
            if user.role in ("referrer", "counsellor"):
                data["staff_mode"] = user.role != "member"
            return self.success_response(data)

        unread = Notification.objects.filter(recipient=user, is_read=False).count()
        photo = request.build_absolute_uri(user.avatar.url) if user.avatar else None
        base_profile = {
            "first_name": user.first_name,
            "full_name": user.full_name,
            "member_number": "",
            "photo": photo,
        }

        if user.role == "referrer":
            staff = get_referrer_dashboard(request, user)
            s = staff["stats"]
            last = staff["recent_activity"][0] if staff.get("recent_activity") else None
            counsellor_data = None
            if user_has_member_profile(user) and user.member_profile.counsellor:
                c = user.member_profile.counsellor
                counsellor_data = {
                    "full_name": c.full_name,
                    "photo": request.build_absolute_uri(c.avatar.url) if c.avatar else None,
                }
            return self.success_response({
                "profile": base_profile,
                "referrer": None,
                "counsellor": counsellor_data,
                "stats": {
                    "attendance_rate": s.get("avg_attendance_rate", 0),
                    "events_attended": 0,
                    "total_events": 0,
                    "unread_notifications": unread,
                },
                "next_event": None,
                "last_activity": (
                    {"description": last["description"], "datetime": last["datetime"], "type": "history"}
                    if last else None
                ),
                "staff_mode": True,
            })

        if user.role == "counsellor":
            staff = get_counsellor_dashboard(request, user)
            s = staff["stats"]
            return self.success_response({
                "profile": base_profile,
                "referrer": None,
                "stats": {
                    "attendance_rate": s.get("avg_attendance_rate", 0),
                    "events_attended": 0,
                    "total_events": 0,
                    "unread_notifications": unread,
                },
                "next_event": None,
                "last_activity": None,
                "staff_mode": True,
            })

        return self.error_response("Profil membre introuvable.", status.HTTP_403_FORBIDDEN)


class MyReferrerView(APIResponseMixin, APIView):
    """Référent assigné au membre (photo et nom). Non accessible aux référents."""

    permission_classes = [IsMember]

    def get(self, request):
        if request.user.role == "referrer":
            return self.error_response(
                "En tant que référent, consultez votre conseiller via « Mon Conseiller ».",
                status.HTTP_403_FORBIDDEN,
            )
        member = request.user.member_profile
        if not member.referrer:
            return self.success_response(None, "Aucun référent assigné.")
        ref = member.referrer
        data = {
            "full_name": ref.full_name,
            "photo": request.build_absolute_uri(ref.avatar.url) if ref.avatar else None,
        }
        return self.success_response(data)


class MyCounsellorView(APIResponseMixin, APIView):
    """Conseiller assigné au référent (lecture seule)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "referrer":
            return self.error_response("Accès réservé aux référents.", status.HTTP_403_FORBIDDEN)

        from apps.members.utils import user_has_member_profile
        if not user_has_member_profile(request.user):
            return self.error_response("Profil membre introuvable.", status.HTTP_404_NOT_FOUND)

        member = request.user.member_profile
        counsellor = member.counsellor
        if not counsellor:
            return self.success_response(None, "Aucun conseiller assigné.")

        qr_code = None
        try:
            qr_code = counsellor.member_profile.qr_code
        except Exception:
            pass

        data = {
            "id": str(counsellor.id),
            "full_name": counsellor.full_name,
            "photo": request.build_absolute_uri(counsellor.avatar.url) if counsellor.avatar else None,
            "phone": counsellor.phone,
            "qr_code": qr_code,
        }
        return self.success_response(data)


class MyEventsView(APIResponseMixin, APIView):
    permission_classes = [IsMember]

    def get(self, request):
        member = request.user.member_profile
        return self.success_response(get_member_events(request, member))


class MyEventDetailView(APIResponseMixin, APIView):
    permission_classes = [IsMember]

    def get(self, request, pk):
        data = get_member_event_detail(request, request.user, pk)
        if not data:
            return self.error_response("Événement introuvable.", status_code=404)
        return self.success_response(data)


class PublicChurchPoleListView(APIResponseMixin, generics.ListAPIView):
    """Pôles visibles lors de l'inscription (sans authentification)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ChurchPoleSerializer
    pagination_class = None

    def get_queryset(self):
        from .seed_catalog import ensure_registration_catalog

        if not ChurchPole.objects.filter(is_active=True).exists():
            ensure_registration_catalog()
        return ChurchPole.objects.filter(is_active=True).order_by("name")

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return self.success_response(serializer.data)


class PublicChurchDepartmentListView(APIResponseMixin, generics.ListAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ChurchDepartmentSerializer
    pagination_class = None

    def get_queryset(self):
        from .seed_catalog import ensure_registration_catalog

        if not ChurchDepartment.objects.filter(is_active=True).exists():
            ensure_registration_catalog()
        qs = ChurchDepartment.objects.filter(is_active=True).select_related("pole")
        pole = self.request.query_params.get("pole")
        if pole:
            qs = qs.filter(pole_id=pole)
        return qs.order_by("name")

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return self.success_response(serializer.data)


class PublicFamilyPoleListView(APIResponseMixin, generics.ListAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = FamilyPoleSerializer
    pagination_class = None

    def get_queryset(self):
        from .seed_catalog import ensure_registration_catalog

        if not FamilyPole.objects.filter(is_active=True).exists():
            ensure_registration_catalog()
        return FamilyPole.objects.filter(is_active=True).order_by("name")

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return self.success_response(serializer.data)


class PublicProfessionListView(APIResponseMixin, generics.ListAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ProfessionSerializer
    pagination_class = None

    def get_queryset(self):
        from django.db import OperationalError, ProgrammingError
        from .seed_catalog import ensure_registration_catalog

        try:
            qs = Profession.objects.filter(is_active=True).order_by("name")
            if not qs.exists():
                ensure_registration_catalog()
                qs = Profession.objects.filter(is_active=True).order_by("name")
            return qs
        except (OperationalError, ProgrammingError):
            return Profession.objects.none()

    def list(self, request, *args, **kwargs):
        from django.db import OperationalError, ProgrammingError

        try:
            serializer = self.get_serializer(self.get_queryset(), many=True)
            return self.success_response(serializer.data)
        except (OperationalError, ProgrammingError):
            return self.success_response([])
