from rest_framework import serializers

from .models import Event


class EventListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    attendance_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            "id",
            "name",
            "description",
            "date",
            "time",
            "location",
            "status",
            "created_by_name",
            "attendance_count",
            "created_at",
        )

    def get_attendance_count(self, obj):
        return obj.attendances.filter(is_present=True).count()


class EventDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    agents = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            "id",
            "name",
            "description",
            "date",
            "time",
            "location",
            "status",
            "created_by",
            "created_by_name",
            "agents",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_by", "created_at", "updated_at")

    def get_agents(self, obj):
        from apps.attendance.models import EventAgentAssignment
        assignments = EventAgentAssignment.objects.filter(event=obj).select_related("agent")
        return [
            {
                "id": str(a.agent.id),
                "name": a.agent.full_name,
                "email": a.agent.email,
                "is_active": a.is_active,
            }
            for a in assignments
        ]


class EventCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ("name", "description", "date", "time", "location", "status")

    def validate_status(self, value):
        if self.instance and self.instance.status == "closed" and value != "closed":
            raise serializers.ValidationError("Un événement fermé ne peut pas être rouvert.")
        return value
