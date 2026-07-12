"""Validation partagée du profil membre complet (inscription + création admin)."""

from rest_framework import serializers


def as_bool(value):
    if isinstance(value, bool):
        return value
    if value in (None, "", "false", "False", "0"):
        return False
    return True


def normalize_registration_bools(attrs):
    for key in ("is_baptized", "icc_modules_completed", "serves_in_church", "serves_in_family"):
        if key in attrs:
            attrs[key] = as_bool(attrs[key])
    return attrs


def apply_registration_side_effects(attrs):
    """Nettoie les champs conditionnels selon les réponses."""
    normalize_registration_bools(attrs)

    if not attrs.get("is_baptized"):
        attrs["baptism_year"] = None

    if not attrs.get("icc_modules_completed"):
        attrs["icc_module_level"] = ""

    if attrs.get("serves_in_church"):
        attrs["interested_church_department"] = None
    else:
        attrs["church_department"] = None

    if attrs.get("serves_in_family"):
        attrs["interested_family_pole"] = None
    else:
        attrs["family_pole"] = None

    dept = attrs.get("church_department") or attrs.get("interested_church_department")
    if dept:
        attrs["church_pole"] = dept.pole
    elif "church_department" not in attrs and "interested_church_department" not in attrs:
        pass
    else:
        attrs["church_pole"] = None

    profession_ref = attrs.get("profession_ref")
    if profession_ref:
        attrs["profession"] = profession_ref.name

    return attrs


def validate_complete_member_profile(attrs, *, require_photo=False, has_photo=False):
    """Lève ValidationError si le profil membre est incomplet."""
    errors = {}
    normalize_registration_bools(attrs)

    required_text = {
        "last_name": "Le nom est obligatoire.",
        "middle_name": "Le postnom est obligatoire.",
        "first_name": "Le prénom est obligatoire.",
        "address": "L'adresse physique est obligatoire.",
        "phone_primary": "Le téléphone principal est obligatoire.",
        "whatsapp": "Le numéro WhatsApp est obligatoire.",
    }
    for field, message in required_text.items():
        if not str(attrs.get(field) or "").strip():
            errors[field] = message

    if not attrs.get("date_of_birth"):
        errors["date_of_birth"] = "La date de naissance est obligatoire."

    if not attrs.get("profession_ref"):
        errors["profession_ref"] = "La profession est obligatoire."

    if not attrs.get("marital_status"):
        errors["marital_status"] = "La situation matrimoniale est obligatoire."

    if require_photo and not has_photo and not attrs.get("photo"):
        errors["photo"] = "La photo de profil est obligatoire."

    if attrs.get("is_baptized") and not attrs.get("baptism_year"):
        errors["baptism_year"] = "Indiquez l'année de baptême."

    if attrs.get("icc_modules_completed") and not attrs.get("icc_module_level"):
        errors["icc_module_level"] = "Sélectionnez le module ICC suivi."

    if attrs.get("serves_in_church"):
        if not attrs.get("church_department"):
            errors["church_department"] = "Indiquez le département dans lequel vous servez."
    elif not attrs.get("interested_church_department"):
        errors["interested_church_department"] = "Indiquez le département qui vous intéresse."

    if attrs.get("serves_in_family"):
        if not attrs.get("family_pole"):
            errors["family_pole"] = "Indiquez le pôle dans lequel vous servez."
    elif not attrs.get("interested_family_pole"):
        errors["interested_family_pole"] = "Indiquez le pôle qui vous intéresse."

    if errors:
        raise serializers.ValidationError(errors)

    return apply_registration_side_effects(attrs)
