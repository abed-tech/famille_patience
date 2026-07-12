"""Limitation de débit — protection brute force."""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Connexion : max 10 tentatives / minute / IP."""

    scope = "login"


class BurstRateThrottle(UserRateThrottle):
    """Utilisateurs authentifiés : rafale courte."""

    scope = "burst"
