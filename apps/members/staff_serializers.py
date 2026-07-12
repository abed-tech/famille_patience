"""Sérialiseurs lecture seule pour référents et conseillers."""
from rest_framework import serializers

from apps.attendance.models import Attendance
from .models import Member
from .serializers import ChurchPoleSerializer, ChurchDepartmentSerializer, FamilyPoleSerializer


class StaffMemberListSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    attendance_rate = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = (
            "id", "member_number", "full_name", "first_name", "last_name",
            "photo", "phone_primary", "status", "attendance_rate", "registration_date",
        )

    def get_attendance_rate(self, obj):
        from apps.dashboard.staff_services import attendance_rate
        return attendance_rate(obj)

    def get_photo(self, obj):
        request = self.context.get("request")
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None


class StaffMemberDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    birth_day_month = serializers.SerializerMethodField()
    family_pole_detail = FamilyPoleSerializer(source="family_pole", read_only=True)
    church_department_detail = ChurchDepartmentSerializer(source="church_department", read_only=True)
    church_pole_detail = ChurchPoleSerializer(source="church_pole", read_only=True)
    photo = serializers.SerializerMethodField()
    attendance_rate = serializers.SerializerMethodField()
    attendances = serializers.SerializerMethodField()
    absences = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = (
            "id", "member_number", "qr_code", "photo", "last_name", "middle_name", "first_name",
            "full_name", "gender", "birth_day_month", "address", "profession", "phone_primary",
            "phone_secondary", "whatsapp", "email", "marital_status", "is_baptized",
            "family_pole_detail", "church_department_detail", "church_pole_detail",
            "status", "registration_date", "attendance_rate", "attendances", "absences",
        )

    def get_birth_day_month(self, obj):
        if not obj.date_of_birth:
            return None
        return obj.date_of_birth.strftime("%d/%m")

    def get_photo(self, obj):
        request = self.context.get("request")
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None

    def get_attendance_rate(self, obj):
        from apps.dashboard.staff_services import attendance_rate
        return attendance_rate(obj)

    def get_attendances(self, obj):
        qs = Attendance.objects.filter(member=obj, is_present=True).select_related("event").order_by("-scanned_at")[:20]
        return [
            {
                "event_name": a.event.name,
                "event_date": a.event.date.isoformat(),
                "scanned_at": a.scanned_at.isoformat(),
            }
            for a in qs
        ]

    def get_absences(self, obj):
        qs = Attendance.objects.filter(member=obj, is_present=False).select_related("event").order_by("-scanned_at")[:20]
        return [
            {
                "event_name": a.event.name,
                "event_date": a.event.date.isoformat(),
            }
            for a in qs
        ]
