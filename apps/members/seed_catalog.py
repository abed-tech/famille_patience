"""Catalogue d'inscription (professions, pôles, départements) — seed idempotent."""

from apps.members.models import ChurchPole, FamilyPole, ChurchDepartment
from apps.members.profession_defaults import ensure_default_professions

FAMILY_POLES = [
    "Jérusalem",
    "Pôle Restauration",
    "Pôle Accueil et Intégration",
    "Pôle Logistique",
    "Pôle Animation (DCA)",
    "Pôle Intercession",
    "Pôle Évangélisation",
    "Pôle Finance",
    "Pôle Secrétariat et Communication",
]

CHURCH_DEPARTMENTS = [
    "Intendance",
    "Ministère de Louange et Adoration",
    "Couple et Famille",
    "Intégration",
    "MDE",
    "MDDS",
    "MFI",
    "MH2I",
    "EJP",
    "AEF",
    "MJI",
    "Protocole",
    "Accueil",
    "Sécurité",
    "Nettoyage",
    "Communication",
    "Audiovisuel",
    "Secrétariat Général",
    "MDP",
    "Social",
    "Impact Santé",
    "Librairie",
    "Formation",
]


def ensure_registration_catalog():
    """Crée professions, pôles famille et départements église si absents."""
    ensure_default_professions()

    church_pole, _ = ChurchPole.objects.get_or_create(
        name="Louange",
        defaults={"description": "Pôle louange", "is_active": True},
    )

    for name in FAMILY_POLES:
        FamilyPole.objects.get_or_create(name=name, defaults={"is_active": True})

    for name in CHURCH_DEPARTMENTS:
        ChurchDepartment.objects.get_or_create(
            name=name,
            pole=church_pole,
            defaults={"description": name, "is_active": True},
        )

    return {
        "professions": ensure_default_professions().count(),
        "family_poles": FamilyPole.objects.filter(is_active=True).count(),
        "church_departments": ChurchDepartment.objects.filter(is_active=True).count(),
    }
