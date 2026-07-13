"""Clients Redis / Upstash et tests de connexion (backend uniquement)."""
import os
from typing import Any


def ping_upstash_rest() -> dict[str, Any]:
    """Teste l'API REST Upstash (set/get/delete éphémère)."""
    url = os.getenv("UPSTASH_REDIS_REST_URL", "").strip()
    token = os.getenv("UPSTASH_REDIS_REST_TOKEN", "").strip()
    if not url or not token:
        return {"ok": False, "error": "UPSTASH_REDIS_REST_URL ou UPSTASH_REDIS_REST_TOKEN manquant"}

    try:
        from upstash_redis import Redis

        client = Redis(url=url, token=token)
        probe = "fp:health:ping"
        client.set(probe, "1", ex=10)
        value = client.get(probe)
        client.delete(probe)
        if value != "1":
            return {"ok": False, "error": "Lecture incohérente après écriture"}
        return {"ok": True, "mode": "rest"}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def ping_native_redis() -> dict[str, Any]:
    """Teste Redis natif (redis:// ou rediss://) pour Channels / Celery."""
    redis_url = (
        os.getenv("REDIS_URL", "").strip()
        or os.getenv("UPSTASH_REDIS_URL", "").strip()
    )
    if not redis_url:
        return {"ok": False, "error": "REDIS_URL ou UPSTASH_REDIS_URL non défini", "skipped": True}

    try:
        import redis

        client = redis.from_url(redis_url, socket_connect_timeout=5)
        client.ping()
        return {"ok": True, "mode": "native"}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def redis_health() -> dict[str, Any]:
    """Résumé santé Redis pour /health/ et management commands."""
    rest = ping_upstash_rest() if _rest_env_set() else {"ok": False, "skipped": True}
    native = ping_native_redis()

    ok = False
    if native.get("ok"):
        ok = True
    elif rest.get("ok") and not native.get("skipped"):
        ok = True
    elif rest.get("ok") and native.get("skipped"):
        ok = True

    return {
        "ok": ok,
        "rest": {k: v for k, v in rest.items() if k != "error"} | (
            {"error": rest["error"]} if rest.get("error") and not rest.get("skipped") else {}
        ),
        "native": {k: v for k, v in native.items() if k != "error"} | (
            {"error": native["error"]} if native.get("error") and not native.get("skipped") else {}
        ),
    }


def _rest_env_set() -> bool:
    return bool(
        os.getenv("UPSTASH_REDIS_REST_URL", "").strip()
        and os.getenv("UPSTASH_REDIS_REST_TOKEN", "").strip()
    )
