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
        value = os.getenv(key, "").strip()
        if value:
            return value
    return None


def redis_fully_configured() -> bool:
    return upstash_rest_configured() or bool(native_redis_url())


def apply_redis_settings(settings_dict: dict) -> None:
    """
    Applique cache, Channels, Celery et sessions sur un dict de settings Django.
    Modifie settings_dict sur place.
    """
    native = native_redis_url()
    rest = upstash_rest_configured()

    if native:
        settings_dict["REDIS_URL"] = native
        settings_dict["CACHES"] = {
            "default": {
                "BACKEND": "django.core.cache.backends.redis.RedisCache",
                "LOCATION": native,
                "OPTIONS": {
                    "ssl_cert_reqs": None if native.startswith("rediss://") else None,
                },
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
            }
        }
        settings_dict["CHANNEL_LAYERS"] = {
            "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
        }
        settings_dict["CELERY_BROKER_URL"] = ""
        settings_dict["CELERY_RESULT_BACKEND"] = ""
    else:
        settings_dict["REDIS_URL"] = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        settings_dict["CACHES"] = {
            "default": {
                "BACKEND": "django.core.cache.backends.redis.RedisCache",
                "LOCATION": settings_dict["REDIS_URL"],
            }
        }
        settings_dict["CHANNEL_LAYERS"] = {
            "default": {
                "BACKEND": "channels_redis.core.RedisChannelLayer",
                "CONFIG": {"hosts": [settings_dict["REDIS_URL"]]},
            }
        }
        settings_dict["CELERY_BROKER_URL"] = settings_dict["REDIS_URL"]
        settings_dict["CELERY_RESULT_BACKEND"] = settings_dict["REDIS_URL"]

    if native or rest:
        settings_dict["SESSION_ENGINE"] = "django.contrib.sessions.backends.cache"
        settings_dict["SESSION_CACHE_ALIAS"] = "default"
