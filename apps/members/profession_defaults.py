"""Liste de professions par défaut pour l'inscription."""

DEFAULT_PROFESSIONS = [
    "Étudiant", "Enseignant", "Médecin", "Infirmier", "Ingénieur", "Comptable",
    "Avocat", "Commerçant", "Fonctionnaire", "Entrepreneur", "Informaticien",
    "Architecte", "Artisan", "Agriculteur", "Chauffeur", "Secrétaire",
    "Journaliste", "Pasteur", "Évangéliste", "Musicien", "Designer",
    "Électricien", "Plombier", "Mécanicien", "Pharmacien", "Psychologue",
    "Sans emploi", "Retraité", "Autre",
]


def ensure_default_professions():
    """Crée les professions manquantes (idempotent). Retourne le queryset actif."""
    from .models import Profession

    for name in DEFAULT_PROFESSIONS:
        Profession.objects.get_or_create(name=name, defaults={"is_active": True})
    return Profession.objects.filter(is_active=True).order_by("name")
