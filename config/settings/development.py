import os

from .base import *  # noqa: F401, F403

DEBUG = True

DATABASES["default"]["OPTIONS"] = {}  # noqa: F405

# Fallback SQLite si USE_SQLITE=true (développement sans Docker)
if os.getenv("USE_SQLITE", "false").lower() in ("true", "1", "yes"):
    DATABASES["default"] = {  # noqa: F405
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}  # noqa: F405
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

INTERNAL_IPS = ["127.0.0.1"]

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
)
