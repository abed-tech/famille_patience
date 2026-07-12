"""Middleware sécurité, journalisation et robustesse."""

import logging
import time
import uuid

from django.http import JsonResponse

logger = logging.getLogger("famille_patience.request")


class RequestLoggingMiddleware:
    """Journalise chaque requête (durée, statut) pour le monitoring."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = uuid.uuid4().hex[:12]
        request.request_id = request_id
        start = time.perf_counter()

        response = self.get_response(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "%s %s %s %sms",
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            extra={"request_id": request_id},
        )
        response["X-Request-ID"] = request_id
        return response


class ApiErrorMiddleware:
    """
    Évite les crashes HTML sur /api/ — renvoie toujours du JSON.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        if not request.path.startswith("/api/"):
            return None
        logger.exception(
            "Erreur non gérée API %s",
            request.path,
            exc_info=exception,
        )
        return JsonResponse(
            {
                "success": False,
                "error": {
                    "code": 500,
                    "message": "Erreur interne du serveur. Réessayez plus tard.",
                },
            },
            status=500,
        )
