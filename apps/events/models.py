import uuid

from django.conf import settings
from django.db import models
from auditlog.registry import auditlog

from apps.core.models import TimeStampedModel


class EventStatus(models.TextChoices):
    DRAFT = "draft", "Brouillon"
    OPEN = "open", "Ouvert"
    CLOSED = "closed", "Fermé"
    CANCELLED = "cancelled", "Annulé"


class Event(TimeStampedModel):
    """Événement de la Famille Patience."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField("Nom", max_length=200)
    description = models.TextField("Description", blank=True)
    date = models.DateField("Date")
    time = models.TimeField("Heure")
    location = models.CharField("Lieu", max_length=255)
    status = models.CharField(
        "Statut",
        max_length=20,
        choices=EventStatus.choices,
        default=EventStatus.DRAFT,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_events",
        verbose_name="Créé par",
    )
    attendance_agents = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="attendance.EventAgentAssignment",
        through_fields=("event", "agent"),
        related_name="assigned_events",
        verbose_name="Agents de pointage",
    )

    class Meta:
        verbose_name = "Événement"
        verbose_name_plural = "Événements"
        ordering = ["-date", "-time"]
        indexes = [
            models.Index(fields=["date", "status"]),
        ]

    def __str__(self):
        return f"{self.name} — {self.date}"

    @property
    def is_open(self):
        return self.status == EventStatus.OPEN

    @property
    def is_closed(self):
        return self.status == EventStatus.CLOSED


auditlog.register(Event)
