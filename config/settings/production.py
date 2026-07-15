from .base import *  # noqa: F401, F403

import os

from django.core.exceptions import ImproperlyConfigured

from config.redis_settings import native_redis_url, upstash_rest_configured

DEBUG = False

# --- Clé secrète obligatoire ---
_INSECURE_KEY = "dev-insecure-key-change-in-production"
if SECRET_KEY == _INSECURE_KEY or len(SECRET_KEY) < 50:  # noqa: F405
    raise ImproperlyConfigured(
        "SECRET_KEY doit être définie dans les variables d'environnement "
        "(min. 50 caractères aléatoires)."
    )

# --- Cloudinary obligatoire (disque Render éphémère) ---
if not _cloudinary_configured():  # noqa: F405
    raise ImproperlyConfigured(
        "Cloudinary requis en production : CLOUDINARY_CLOUD_NAME + "
        "CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET "
        "(recommandé), ou CLOUDINARY_URL valide cloudinary://KEY:SECRET@CLOUD. "
        "Si CLOUDINARY_URL est mal formée, SUPPRIMEZ-LA et utilisez les 3 variables. "
        "Voir docs/DEPLOIEMENT_RENDER.md"
    )

# --- HTTPS & cookies ---
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# --- CSRF / CORS (domaines explicites) ---
CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
    if o.strip()
]
if not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured("CSRF_TRUSTED_ORIGINS requis en production.")

if not upstash_rest_configured() and not native_redis_url():
    raise ImproperlyConfigured(
        "Upstash requis en production : définissez UPSTASH_REDIS_REST_URL + "
        "UPSTASH_REDIS_REST_TOKEN, et idéalement UPSTASH_REDIS_URL (Redis Connect)."
    )
DATABASES["default"]["CONN_MAX_AGE"] = 600  # noqa: F405
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True  # noqa: F405

# --- Email (console en dev, SMTP en prod si configuré) ---
if os.getenv("EMAIL_HOST"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.getenv("EMAIL_HOST")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() in ("true", "1")
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
    DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@famille-patience.org")

# --- Journalisation production ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.security": {"level": "WARNING", "handlers": ["console"], "propagate": False},
        "famille_patience": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "famille_patience.request": {"level": "INFO", "handlers": ["console"], "propagate": False},
    },
}
