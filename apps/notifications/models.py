import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """Notification système."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Destinataire",
        null=True,
        blank=True,
    )
    title = models.CharField("Titre", max_length=200)
    message = models.TextField("Message")
    notification_type = models.CharField("Type", max_length=50)
    is_read = models.BooleanField("Lu", default=False)
    metadata = models.JSONField("Métadonnées", default=dict, blank=True)

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
