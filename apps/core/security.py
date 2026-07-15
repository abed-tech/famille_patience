"""Validation et utilitaires de sécurité."""

from django.core.exceptions import ValidationError

ALLOWED_IMAGE_CONTENT_TYPES = frozenset({
    "image/jpeg",
    "image/png",
    "image/webp",
})
MAX_UPLOAD_IMAGE_BYTES = 5 * 1024 * 1024  # 5 Mo


def validate_uploaded_image(uploaded_file):
    """
    Vérifie taille, format et contenu réel (anti-upload malveillant).
    À appeler sur tout ImageField reçu via multipart.
    """
    if not uploaded_file:
        return

    size = getattr(uploaded_file, "size", 0) or 0
    if size > MAX_UPLOAD_IMAGE_BYTES:
        raise ValidationError("L'image dépasse 5 Mo.")

    content_type = (getattr(uploaded_file, "content_type", "") or "").split(";")[0].strip().lower()
    # Certains mobiles envoient image/jpg, application/octet-stream, ou un type vide.
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES | {
        "image/jpg",
        "application/octet-stream",
    }:
        raise ValidationError("Format autorisé : JPEG, PNG ou WebP uniquement.")

    try:
        from PIL import Image

        uploaded_file.seek(0)
        with Image.open(uploaded_file) as img:
            fmt = (img.format or "").upper()
            img.verify()
        uploaded_file.seek(0)
        if fmt and fmt not in {"JPEG", "JPG", "PNG", "WEBP"}:
            raise ValidationError("Format autorisé : JPEG, PNG ou WebP uniquement.")
    except ValidationError:
        raise
    except Exception as exc:
        raise ValidationError("Fichier image invalide ou corrompu.") from exc
