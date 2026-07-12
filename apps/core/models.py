from django.db import models


class TimeStampedModel(models.Model):
    """Modèle abstrait avec horodatage de création et modification."""

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modifié le")

    class Meta:
        abstract = True
