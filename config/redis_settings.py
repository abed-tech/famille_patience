"""
Configuration Redis / Upstash — Famille Patience.

Variables supportées (jamais de secrets en dur) :
- UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN : API REST Upstash (cache HTTP)
- UPSTASH_REDIS_URL ou REDIS_URL : protocole Redis natif (Channels, Celery, cache optionnel)

En production Render, renseignez au minimum les variables REST Upstash et l'URL native
(onglet « Redis Connect » du dashboard Upstash, format rediss://...).
"""
import os


def upstash_rest_configured() -> bool:
    return bool(
        os.getenv("UPSTASH_REDIS_REST_URL", "").strip()
        and os.getenv("UPSTASH_REDIS_REST_TOKEN", "").strip()
    )


def native_redis_url() -> str | None:
    """URL Redis native (redis:// ou rediss://) pour Channels, Celery et cache."""
    for key in ("REDIS_URL", "UPSTASH_REDIS_URL"):
        value = os.getenv(key, "").strip().strip('"').strip("'")
        if value.startswith(("redis://", "rediss://")):
            return value
    return None


def redis_fully_configured() -> bool:
    return upstash_rest_configured() or bool(native_redis_url())


def apply_redis_settings(settings_dict: dict) -> None:
    """
    Applique cache, Channels, Celery sur un dict de settings Django.
    Sessions : toujours base de données (évite 500 si Redis/Upstash indisponible).
    """
    native = native_redis_url()
    rest = upstash_rest_configured()

    # Sessions indépendantes de Redis — l'auth JWT n'en a pas besoin,
    # mais le middleware / CSRF / admin ne doivent pas planter.
    settings_dict["SESSION_ENGINE"] = "django.contrib.sessions.backends.db"

    if native:
        settings_dict["REDIS_URL"] = native
        cache_options = {}
        if native.startswith("rediss://"):
            # Upstash TLS — ne pas exiger un CA local
            import ssl

            cache_options["ssl_cert_reqs"] = ssl.CERT_NONE
        settings_dict["CACHES"] = {
            "default": {
                "BACKEND": "django.core.cache.backends.redis.RedisCache",
                "LOCATION": native,
                "OPTIONS": cache_options,
            }
        }
        settings_dict["CHANNEL_LAYERS"] = {
            "default": {
                "BACKEND": "channels_redis.core.RedisChannelLayer",
                "CONFIG": {"hosts": [native]},
            }
        }
        settings_dict["CELERY_BROKER_URL"] = native
        settings_dict["CELERY_RESULT_BACKEND"] = native
    elif rest:
        settings_dict["REDIS_URL"] = ""
        settings_dict["CACHES"] = {
            "default": {
                "BACKEND": "apps.core.cache_upstash.UpstashRedisCache",
                "LOCATION": "upstash",
            }
        }
        settings_dict["CHANNEL_LAYERS"] = {
            "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
        }
        settings_dict["CELERY_BROKER_URL"] = ""
        settings_dict["CELERY_RESULT_BACKEND"] = ""
    else:
        # Fallback local / mémoire (jamais bloquer le login en prod partiellement configurée)
        settings_dict["REDIS_URL"] = "redis://localhost:6379/0"
        settings_dict["CACHES"] = {
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "fp-fallback",
            }
        }
        settings_dict["CHANNEL_LAYERS"] = {
            "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
        }
        settings_dict["CELERY_BROKER_URL"] = settings_dict["REDIS_URL"]
        settings_dict["CELERY_RESULT_BACKEND"] = settings_dict["REDIS_URL"]
