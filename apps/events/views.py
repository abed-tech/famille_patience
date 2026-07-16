from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsAdmin
from .models import Event, EventStatus
from .serializers import EventListSerializer, EventDetailSerializer, EventCreateUpdateSerializer


class EventListCreateView(APIResponseMixin, generics.ListCreateAPIView):
    queryset = Event.objects.select_related("created_by").prefetch_related("attendances")
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "date"]
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return EventCreateUpdateSerializer
        return EventListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(created_by=request.user)
        return self.created_response(
            EventDetailSerializer(event).data,
            "Événement créé.",
        )


class EventDetailView(APIResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.select_related("created_by")
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return EventCreateUpdateSerializer
        return EventDetailSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = EventCreateUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.success_response(EventDetailSerializer(instance).data, "Événement mis à jour.")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == EventStatus.OPEN:
            return self.error_response(
                "Impossible de supprimer un événement ouvert. Fermez-le d'abord.",
                status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return self.success_response(message="Événement supprimé.")


class EventOpenView(APIResponseMixin, generics.GenericAPIView):
    queryset = Event.objects.all()
    permission_classes = [IsAdmin]
    lookup_field = "pk"

    def post(self, request, pk):
        from django.db import transaction

        from apps.members.models import Member
        from apps.attendance.services import assign_attendance_agent

        member_ids = request.data.get("member_ids") or []
        if not member_ids:
            return self.error_response(
                "Sélectionnez au moins un agent pointeur pour ouvrir l'événement.",
                status.HTTP_400_BAD_REQUEST,
            )
        if len(member_ids) > 5:
            return self.error_response(
                "Maximum 5 agents pointeurs par événement.",
                status.HTTP_400_BAD_REQUEST,
            )

        event = self.get_object()
        if event.status != EventStatus.DRAFT:
            return self.error_response("Seul un brouillon peut être ouvert.", status.HTTP_400_BAD_REQUEST)

        assigned = []
        errors = []
        with transaction.atomic():
            for member_id in member_ids[:5]:
                try:
                    member = Member.objects.select_related("user").get(pk=member_id)
                    if not member.user:
                        errors.append(f"{member.full_name} : pas de compte utilisateur.")
                        continue
                    assign_attendance_agent(event, member.user, request.user)
                    assigned.append(member.full_name)
                except Member.DoesNotExist:
                    errors.append(f"Membre {member_id} introuvable.")
                except ValueError as e:
                    errors.append(str(e))

            if not assigned:
                detail = " ".join(errors) if errors else ""
                return self.error_response(
                    "Aucun agent pointeur valide. L'événement n'a pas été ouvert."
                    + (f" {detail}" if detail else ""),
                    status.HTTP_400_BAD_REQUEST,
                )

            event.status = EventStatus.OPEN
            # Aligner la date sur aujourd'hui pour que la séance ouverte = séance du jour
            from django.utils import timezone
            today = timezone.localdate()
            update_fields = ["status", "updated_at"]
            if event.date != today:
                event.date = today
                update_fields.append("date")
            event.save(update_fields=update_fields)

        message = f"Événement ouvert. Agents pointeurs : {', '.join(assigned)}."
        if errors:
            message += " " + " ".join(errors)

        return self.success_response(EventDetailSerializer(event).data, message)


class EventCloseView(APIResponseMixin, generics.GenericAPIView):
    queryset = Event.objects.all()
    permission_classes = [IsAdmin]
    lookup_field = "pk"

    def post(self, request, pk):
        from apps.attendance.services import revoke_event_agents, finalize_event_attendance

        event = self.get_object()
        if event.status != EventStatus.OPEN:
            return self.error_response("Seul un événement ouvert peut être fermé.", status.HTTP_400_BAD_REQUEST)
        event.status = EventStatus.CLOSED
        event.save(update_fields=["status", "updated_at"])
        revoke_event_agents(event)
        stats = finalize_event_attendance(event)
        data = EventDetailSerializer(event).data
        data["attendance_summary"] = stats
        return self.success_response(
            data,
            f"Événement fermé. L'application de pointage a été retirée aux agents. "
            f"{stats['absent_count']} absence(s) enregistrée(s) automatiquement.",
        )
