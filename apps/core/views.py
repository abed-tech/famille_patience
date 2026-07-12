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

    status = 200 if db_ok else 503
    return JsonResponse(
        {"status": "ok" if db_ok else "degraded", "database": db_ok},
        status=status,
    )
