from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsAdmin, IsStaffRole
from .models import Member, MemberHistory, ChurchPole, ChurchDepartment, FamilyPole, Profession, MemberStatus
from .serializers import (
    MemberListSerializer,
    MemberDetailSerializer,
    MemberCreateUpdateSerializer,
    MemberHistorySerializer,
    ChurchPoleSerializer,
    ChurchDepartmentSerializer,
    FamilyPoleSerializer,
    ProfessionSerializer,
)
from .staff_serializers import StaffMemberListSerializer, StaffMemberDetailSerializer


class MemberQuerysetMixin:
    """Filtre les membres selon le rôle de l'utilisateur."""

    def get_queryset(self):
        user = self.request.user
        qs = Member.objects.select_related(
            "church_pole",
            "church_department",
            "family_pole",
            "referrer",
            "counsellor",
            "user",
        )

        if user.role == "admin":
            return qs
        if user.role == "counsellor":
            return qs.filter(counsellor=user)
        if user.role == "referrer":
            return qs.filter(referrer=user)
        if user.role == "member" and hasattr(user, "member_profile"):
            return qs.filter(pk=user.member_profile.pk)
        return qs.none()


class MemberListCreateView(MemberQuerysetMixin, APIResponseMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "gender", "church_pole", "family_pole", "referrer", "counsellor"]
    search_fields = ["first_name", "last_name", "member_number", "phone_primary", "email"]
    ordering_fields = ["last_name", "registration_date", "created_at"]
    ordering = ["last_name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdmin()]
        if self.request.user.role == "admin":
            return [IsAdmin()]
        return [IsStaffRole()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MemberCreateUpdateSerializer
        if self.request.user.role in ("referrer", "counsellor"):
            return StaffMemberListSerializer
        return MemberListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer_class = self.get_serializer_class()
        if page is not None:
            serializer = serializer_class(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = serializer_class(queryset, many=True, context={"request": request})
        return self.success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        return self.created_response(
            MemberDetailSerializer(member).data,
            "Membre créé avec succès.",
        )


class MemberDetailView(MemberQuerysetMixin, APIResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAdmin()]
        return [IsStaffRole()]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return MemberCreateUpdateSerializer
        return MemberDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role in ("referrer", "counsellor"):
            data = StaffMemberDetailSerializer(instance, context={"request": request}).data
        else:
            data = MemberDetailSerializer(instance).data
        return self.success_response(data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = MemberCreateUpdateSerializer(
            instance, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.success_response(
            MemberDetailSerializer(instance).data,
            "Membre mis à jour.",
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = MemberStatus.INACTIVE
        instance.save(update_fields=["status"])
        return self.success_response(message="Membre désactivé.")


class MemberHistoryView(MemberQuerysetMixin, APIResponseMixin, generics.ListAPIView):
    serializer_class = MemberHistorySerializer
    permission_classes = [IsStaffRole]

    def get_queryset(self):
        member = get_object_or_404(MemberQuerysetMixin.get_queryset(self), pk=self.kwargs["pk"])
        return MemberHistory.objects.filter(member=member).select_related("performed_by")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)


class MemberCardView(MemberQuerysetMixin, APIResponseMixin, generics.RetrieveAPIView):
    """Carte de membre avec QR Code."""
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def retrieve(self, request, *args, **kwargs):
        member = self.get_object()
        role = member.user.role if member.user_id else "member"
        role_labels = {"member": "Membre", "referrer": "Référent", "counsellor": "Conseiller", "admin": "Administrateur"}
        data = {
            "member_number": member.member_number,
            "full_name": member.full_name,
            "photo": request.build_absolute_uri(member.photo.url) if member.photo else None,
            "qr_code": member.qr_code,
            "family_pole": member.family_pole.name if member.family_pole else None,
            "status": member.status,
            "registration_date": member.registration_date,
            "role": role,
            "role_label": role_labels.get(role, "Membre"),
        }
        return self.success_response(data)


class ChurchPoleListCreateView(APIResponseMixin, generics.ListCreateAPIView):
    serializer_class = ChurchPoleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.role == "admin":
            return ChurchPole.objects.all().order_by("name")
        return ChurchPole.objects.filter(is_active=True).order_by("name")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdmin()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return self.created_response(ChurchPoleSerializer(instance).data, "Pôle église créé.")


class ChurchDepartmentListCreateView(APIResponseMixin, generics.ListCreateAPIView):
    serializer_class = ChurchDepartmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["pole"]

    def get_queryset(self):
        qs = ChurchDepartment.objects.select_related("pole")
        if self.request.user.is_authenticated and self.request.user.role == "admin":
            return qs.order_by("pole__name", "name")
        return qs.filter(is_active=True).order_by("pole__name", "name")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdmin()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return self.created_response(ChurchDepartmentSerializer(instance).data, "Département créé.")


class ChurchDepartmentDetailView(APIResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = ChurchDepartment.objects.select_related("pole")
    serializer_class = ChurchDepartmentSerializer
    permission_classes = [IsAdmin]
    lookup_field = "pk"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return self.success_response(ChurchDepartmentSerializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.success_response(ChurchDepartmentSerializer(instance).data, "Département mis à jour.")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.members.exists() or instance.interested_members.exists():
            instance.is_active = False
            instance.save(update_fields=["is_active"])
            return self.success_response(message="Département désactivé (membres associés).")
        instance.delete()
        return self.success_response(message="Département supprimé.")


class FamilyPoleListCreateView(APIResponseMixin, generics.ListCreateAPIView):
    serializer_class = FamilyPoleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.role == "admin":
            return FamilyPole.objects.all().order_by("name")
        return FamilyPole.objects.filter(is_active=True).order_by("name")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdmin()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return self.created_response(FamilyPoleSerializer(instance).data, "Pôle créé.")


class FamilyPoleDetailView(APIResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = FamilyPole.objects.all()
    serializer_class = FamilyPoleSerializer
    permission_classes = [IsAdmin]
    lookup_field = "pk"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return self.success_response(FamilyPoleSerializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.success_response(FamilyPoleSerializer(instance).data, "Pôle mis à jour.")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.members.exists() or instance.interested_members.exists():
            instance.is_active = False
            instance.save(update_fields=["is_active"])
            return self.success_response(message="Pôle désactivé (membres associés).")
        instance.delete()
        return self.success_response(message="Pôle supprimé.")


class ProfessionListCreateView(APIResponseMixin, generics.ListCreateAPIView):
    serializer_class = ProfessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.role == "admin":
            return Profession.objects.all().order_by("name")
        return Profession.objects.filter(is_active=True).order_by("name")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdmin()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return self.created_response(ProfessionSerializer(instance).data, "Profession créée.")


class ProfessionDetailView(APIResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Profession.objects.all()
    serializer_class = ProfessionSerializer
    permission_classes = [IsAdmin]
    lookup_field = "pk"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return self.success_response(ProfessionSerializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.success_response(ProfessionSerializer(instance).data, "Profession mise à jour.")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.members.exists():
            instance.is_active = False
            instance.save(update_fields=["is_active"])
            return self.success_response(message="Profession désactivée (membres associés).")
        instance.delete()
        return self.success_response(message="Profession supprimée.")
