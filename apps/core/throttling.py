"""Limitation de débit — protection brute force."""

import logging

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

logger = logging.getLogger("famille_patience")


class LoginRateThrottle(AnonRateThrottle):
    """Connexion : max 10 tentatives / minute / IP. Ne bloque jamais le login si le cache échoue."""

    scope = "login"

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception:
            logger.exception("LoginRateThrottle: cache indisponible — requête autorisée")
            return True


class BurstRateThrottle(UserRateThrottle):
    """Utilisateurs authentifiés : rafale courte."""

    scope = "burst"

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception:
            logger.exception("BurstRateThrottle: cache indisponible — requête autorisée")
            return True
