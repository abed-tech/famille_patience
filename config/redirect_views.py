"""Redirections legacy → applications unifiées."""
from django.shortcuts import redirect
from django.views import View


class ConseillerRedirectView(View):
    """Ancienne app /conseiller/ → espace membre unifié."""

    _MAP = {
        "connexion": "/membre/connexion",
        "dashboard": "/membre/encadrement",
        "referents": "/membre/mes-referents",
        "evenements": "/membre/evenements",
        "profil": "/membre/profil",
    }

    def get(self, request, path=""):
        path = (path or "").strip("/")
        target = self._MAP.get(path, f"/membre/{path}" if path else "/membre/accueil")
        return redirect(target, permanent=False)


class ReferentRedirectView(View):
    """Ancienne app /referent/ → espace membre."""

    _MAP = {
        "connexion": "/membre/connexion",
        "dashboard": "/membre/accueil",
        "membres": "/membre/mes-membres",
    }

    def get(self, request, path=""):
        path = (path or "").strip("/")
        target = self._MAP.get(path, f"/membre/{path}" if path else "/membre/accueil")
        return redirect(target, permanent=False)


class PointageRedirectView(View):
    """Ancienne app /pointage/ → pointage dans l'espace membre."""

    _MAP = {
        "connexion": "/membre/connexion",
        "accueil": "/membre/pointage",
        "scan": "/membre/pointage/scan",
        "evenements": "/membre/evenements",
    }

    def get(self, request, path=""):
        path = (path or "").strip("/")
        target = self._MAP.get(path, f"/membre/pointage/{path}" if path else "/membre/pointage")
        return redirect(target, permanent=False)
