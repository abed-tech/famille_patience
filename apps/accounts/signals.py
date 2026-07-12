from auditlog.registry import auditlog
from django.contrib.auth import get_user_model
from django.db.models.signals import pre_save
from django.dispatch import receiver

User = get_user_model()
auditlog.register(User, exclude_fields=["password", "last_login"])


@receiver(pre_save, sender=User)
def delete_old_user_avatar(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return
    if old.avatar and old.avatar != instance.avatar:
        try:
            old.avatar.delete(save=False)
        except Exception:
            pass
