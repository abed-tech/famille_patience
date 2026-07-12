from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Event, EventStatus


@receiver(post_save, sender=Event)
def notify_event_status_change(sender, instance, created, **kwargs):
    if created:
        return
    from apps.notifications.services import create_notification

    if instance.status == EventStatus.OPEN:
        create_notification(
            title="Événement ouvert",
            message=f"L'événement « {instance.name} » est maintenant ouvert.",
            notification_type="event_open",
            metadata={"event_id": str(instance.id)},
        )
    elif instance.status == EventStatus.CLOSED:
        create_notification(
            title="Événement fermé",
            message=f"L'événement « {instance.name} » est fermé.",
            notification_type="event_close",
            metadata={"event_id": str(instance.id)},
        )
