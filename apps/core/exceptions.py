import logging

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger("famille_patience")


def custom_exception_handler(exc, context):
    """Gestionnaire d'exceptions API unifié — aucun crash exposé au client."""
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            "success": False,
            "error": {
                "code": response.status_code,
                "message": _extract_message(response.data),
                "details": response.data,
            },
        }
        response.data = custom_data
        return response

    logger.exception(
        "Exception non gérée sur %s",
        context.get("request").path if context.get("request") else "?",
        exc_info=exc,
    )
    return Response(
        {
            "success": False,
            "error": {
                "code": 500,
                "message": "Erreur interne du serveur. Réessayez plus tard.",
            },
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _extract_message(data):
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        for key, value in data.items():
            msg = _extract_message(value)
            if msg:
                return f"{key}: {msg}"
    elif isinstance(data, list) and data:
        return str(data[0])
    return str(data)
