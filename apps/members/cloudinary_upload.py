"""Upload médias via le SDK Cloudinary officiel (plus fiable que django-cloudinary-storage)."""

from __future__ import annotations

import logging
import os
from io import BytesIO

from django.conf import settings

logger = logging.getLogger("famille_patience")


def ensure_cloudinary_config() -> dict:
    cfg = dict(getattr(settings, "CLOUDINARY_STORAGE", None) or {})
    cloud_name = (cfg.get("CLOUD_NAME") or os.getenv("CLOUDINARY_CLOUD_NAME") or "").strip()
    api_key = (cfg.get("API_KEY") or os.getenv("CLOUDINARY_API_KEY") or "").strip()
    api_secret = (cfg.get("API_SECRET") or os.getenv("CLOUDINARY_API_SECRET") or "").strip()

    if not (cloud_name and api_key and api_secret):
        raise RuntimeError(
            "Cloudinary non configuré. Définissez CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET sur Render."
        )

    import cloudinary

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    return {"CLOUD_NAME": cloud_name, "API_KEY": api_key, "API_SECRET": api_secret}


def upload_image_file(uploaded_file, folder: str = "members/photos") -> str:
    """
    Envoie le fichier à Cloudinary et retourne le public_id.
    À stocker ensuite dans ImageField via UPDATE SQL (sans re-upload storage).
    """
    ensure_cloudinary_config()
    import cloudinary.uploader

    uploaded_file.seek(0)
    raw = uploaded_file.read()
    uploaded_file.seek(0)
    if not raw:
        raise RuntimeError("Fichier photo vide.")

    filename = getattr(uploaded_file, "name", None) or "photo.jpg"
    filename = os.path.basename(str(filename))[:80] or "photo.jpg"

    result = cloudinary.uploader.upload(
        BytesIO(raw),
        folder=folder.rstrip("/"),
        resource_type="image",
        use_filename=True,
        unique_filename=True,
        filename_override=filename,
    )
    public_id = (result or {}).get("public_id")
    if not public_id:
        raise RuntimeError("Réponse Cloudinary invalide (public_id manquant).")
    return public_id


def attach_image_to_field(instance, field_name: str, public_id: str) -> None:
    """Assigne un public_id Cloudinary sans déclencher storage.save()."""
    type(instance).objects.filter(pk=instance.pk).update(**{field_name: public_id})
    getattr(instance, field_name).name = public_id
