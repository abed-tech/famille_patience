from rest_framework import serializers

from .models import Attendance, EventAgentAssignment


class AttendanceSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)
    member_number = serializers.CharField(source="member.member_number", read_only=True)
    scanned_by_name = serializers.CharField(source="scanned_by.full_name", read_only=True)

    class Meta:
        model = Attendance
        fields = (
            "id",
            "event",
            "member",
            "member_name",
            "member_number",
            "scanned_by",
            "scanned_by_name",
            "scanned_at",
            "is_present",
            "scan_mode",
        )
        read_only_fields = ("scanned_by", "scanned_at")


class ScanQRSerializer(serializers.Serializer):
    qr_code = serializers.CharField(max_length=100)
    event_id = serializers.UUIDField()
    scan_mode = serializers.ChoiceField(
        choices=[("qr", "QR Code"), ("manual", "Manuel")],
        required=False,
        default="qr",
    )


class AssignAgentSerializer(serializers.Serializer):
    agent_id = serializers.UUIDField(required=False)
    member_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if not attrs.get("agent_id") and not attrs.get("member_id"):
            raise serializers.ValidationError("Indiquez agent_id ou member_id.")
        return attrs
