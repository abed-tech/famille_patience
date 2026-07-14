"""Limitation de débit — protection brute force (tolérant si le cache Redis échoue)."""

import logging

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

logger = logging.getLogger("famille_patience")


class SafeAnonRateThrottle(AnonRateThrottle):
    """Throttle anonymes : n'interrompt jamais l'API si Redis/cache est indisponible."""

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception:
            logger.exception("SafeAnonRateThrottle: cache indisponible — requête autorisée")
            return True


class SafeUserRateThrottle(UserRateThrottle):
    """Throttle utilisateurs : n'interrompt jamais l'API si Redis/cache est indisponible."""

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception:
            logger.exception("SafeUserRateThrottle: cache indisponible — requête autorisée")
            return True


class LoginRateThrottle(SafeAnonRateThrottle):
    """Connexion : max 10 tentatives / minute / IP."""

    scope = "login"


class BurstRateThrottle(SafeUserRateThrottle):
    """Utilisateurs authentifiés : rafale courte."""

    scope = "burst"
