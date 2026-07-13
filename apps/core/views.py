"""Endpoints système (health check, etc.)."""

from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.cache import never_cache


@never_cache
@require_GET
def health_check(request):
    """Vérification de disponibilité pour Render / monitoring."""
    from django.db import connection

    db_ok = True
    try:
        connection.ensure_connection()
    except Exception:
        db_ok = False

    redis_ok = None
    try:
        from apps.core.redis_client import redis_health

        redis_ok = redis_health().get("ok")
    except Exception:
        redis_ok = False

    healthy = db_ok and (redis_ok is not False)
    status = 200 if healthy else 503
    return JsonResponse(
        {
            "status": "ok" if healthy else "degraded",
            "database": db_ok,
            "redis": redis_ok,
        },
        status=status,
    )
