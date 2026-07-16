"""Endpoints système (health check, etc.)."""

from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.cache import never_cache


@never_cache
@require_GET
def health_check(request):
    """
    Vérification de disponibilité pour Render / monitoring.

    Le déploiement Render exige un 200 sur ce chemin. On ne fait échouer
    le check que si la base est inaccessible — Redis en échec est signalé
    comme « degraded » sans bloquer le deploy (Upstash free peut cold-start).
    """
    from django.db import connection

    db_ok = True
    db_error = None
    try:
        connection.ensure_connection()
    except Exception as exc:
        db_ok = False
        db_error = str(exc)

    redis_ok = None
    try:
        from apps.core.redis_client import redis_health

        redis_ok = redis_health().get("ok")
    except Exception:
        redis_ok = False

    # Render health check : DB obligatoire, Redis informatif.
    status = 200 if db_ok else 503
    payload = {
        "status": "ok" if db_ok and redis_ok is not False else ("degraded" if db_ok else "error"),
        "database": db_ok,
        "redis": redis_ok,
    }
    if db_error:
        payload["database_error"] = db_error
    return JsonResponse(payload, status=status)
