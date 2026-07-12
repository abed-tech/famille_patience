"""Contrôle d'accès par application — Famille Patience."""

APP_MEMBER = "membre"
APP_ADMIN = "gestion"
APP_STAFF = "referent"
APP_COUNSELLOR = "conseiller"
APP_POINTAGE = "pointage"

APP_ALLOWED_ROLES = {
    APP_MEMBER: {"member", "referrer", "counsellor"},
    APP_ADMIN: {"admin"},
    APP_STAFF: {"referrer", "counsellor"},
    APP_COUNSELLOR: {"counsellor"},
    APP_POINTAGE: {"member", "referrer", "counsellor", "admin"},
}

APP_LABELS = {
    APP_MEMBER: "Application Membre",
    APP_ADMIN: "Application Administrateur",
    APP_STAFF: "Application Référent / Conseiller",
    APP_COUNSELLOR: "Application Conseiller",
    APP_POINTAGE: "Application Agent de pointage",
}


def role_allowed_for_app(role, app_id):
    return role in APP_ALLOWED_ROLES.get(app_id, set())


def access_denied_message(app_id):
    return f"Accès refusé. Cette connexion est réservée à : {APP_LABELS.get(app_id, app_id)}."
