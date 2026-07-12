import uuid

from django.conf import settings
from django.db import models
from auditlog.registry import auditlog

from apps.core.models import TimeStampedModel


class EventAgentAssignment(TimeStampedModel):
    """Affectation d'un agent de pointage à un événement (max 5)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="agent_assignments",
        verbose_name="Événement",
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="agent_assignments",
        verbose_name="Agent",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="agents_assigned",
        verbose_name="Assigné par",
    )
    is_active = models.BooleanField("Actif", default=True)

    class Meta:
        verbose_name = "Affectation agent"
        verbose_name_plural = "Affectations agents"
        unique_together = [("event", "agent")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.agent} → {self.event}"


class Attendance(TimeStampedModel):
    """Enregistrement de présence à un événement."""

    class ScanMode(models.TextChoices):
        QR = "qr", "QR Code"
        MANUAL = "manual", "Manuel"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="attendances",
        verbose_name="Événement",
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.CASCADE,
        related_name="attendances",
        verbose_name="Membre",
    )
    scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="scans_performed",
        verbose_name="Scanné par",
    )
    scanned_at = models.DateTimeField("Date et heure du scan", auto_now_add=True)
    is_present = models.BooleanField("Présent", default=True)
    scan_mode = models.CharField(
        "Mode de pointage",
        max_length=10,
        choices=ScanMode.choices,
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = "Présence"
        verbose_name_plural = "Présences"
        unique_together = [("event", "member")]
        ordering = ["-scanned_at"]
        indexes = [
            models.Index(fields=["event", "is_present"]),
            models.Index(fields=["member", "scanned_at"]),
        ]

    def __str__(self):
        status = "Présent" if self.is_present else "Absent"
        return f"{self.member} — {self.event} ({status})"


auditlog.register(Attendance)
auditlog.register(EventAgentAssignment)
