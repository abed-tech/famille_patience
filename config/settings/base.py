"""Paramètres Django partagés — Famille Patience."""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR / ".env")


def _cloudinary_configured():
    """Cloudinary via variables séparées ou CLOUDINARY_URL."""
    if os.getenv("CLOUDINARY_CLOUD_NAME") and os.getenv("CLOUDINARY_API_KEY") and os.getenv("CLOUDINARY_API_SECRET"):
        return True
    return bool(os.getenv("CLOUDINARY_URL", "").strip())


def _parse_cloudinary_url(url: str) -> dict | None:
    """Extrait cloud_name / api_key / api_secret depuis CLOUDINARY_URL."""
    import re
    from urllib.parse import unquote

    url = url.strip().strip('"').strip("'")
    # cloudinary://API_KEY:API_SECRET@CLOUD_NAME
    match = re.match(
        r"^cloudinary://([^:]+):([^@]+)@([^/\s?#]+)",
        url,
        flags=re.IGNORECASE,
    )
    if not match:
        return None
    return {
        "CLOUD_NAME": match.group(3).strip(),
        "API_KEY": unquote(match.group(1).strip()),
        "API_SECRET": unquote(match.group(2).strip()),
    }


def _cloudinary_storage_settings():
    """Construit CLOUDINARY_STORAGE sans secret en dur dans le code."""
    # Priorité 1 : variables séparées (plus fiables sur Render)
    cloud_name = (os.getenv("CLOUDINARY_CLOUD_NAME") or "").strip().strip('"').strip("'")
    api_key = (os.getenv("CLOUDINARY_API_KEY") or "").strip().strip('"').strip("'")
    api_secret = (os.getenv("CLOUDINARY_API_SECRET") or "").strip().strip('"').strip("'")
    if cloud_name and api_key and api_secret:
        return {
            "CLOUD_NAME": cloud_name,
            "API_KEY": api_key,
            "API_SECRET": api_secret,
        }

    # Priorité 2 : CLOUDINARY_URL
    url = (os.getenv("CLOUDINARY_URL") or "").strip()
    if url:
        parsed = _parse_cloudinary_url(url)
        if parsed:
            return parsed
        raise ValueError(
            "CLOUDINARY_URL invalide. Attendu : cloudinary://API_KEY:API_SECRET@CLOUD_NAME "
            "(sans guillemets). Plus simple : définissez CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET, puis SUPPRIMEZ CLOUDINARY_URL."
        )

    raise ValueError(
        "Cloudinary non configuré. Définissez CLOUDINARY_CLOUD_NAME + "
        "CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET (recommandé) "
        "ou CLOUDINARY_URL."
    )


SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-key-change-in-production")

DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [
    h.strip() for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
]

# Applications
DJANGO_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "channels",
    "auditlog",
]

if _cloudinary_configured():
    THIRD_PARTY_APPS += ["cloudinary_storage", "cloudinary"]

LOCAL_APPS = [
    "apps.core",
    "apps.accounts",
    "apps.members",
    "apps.events",
    "apps.attendance",
    "apps.notifications",
    "apps.dashboard",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.RequestLoggingMiddleware",
    "apps.core.middleware.ApiErrorMiddleware",
    "auditlog.middleware.AuditlogMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "frontend" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Base de données — DATABASE_URL (Render) ou variables séparées
if os.getenv("DATABASE_URL"):
    import dj_database_url

    DATABASES = {
        "default": dj_database_url.config(
            default=os.getenv("DATABASE_URL"),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "famille_patience"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD", "postgres"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }

# Cache, Channels, Celery, sessions — Upstash / Redis
from config.redis_settings import apply_redis_settings

_redis_cfg: dict = {}
apply_redis_settings(_redis_cfg)
REDIS_URL = _redis_cfg["REDIS_URL"]
CACHES = _redis_cfg["CACHES"]
CHANNEL_LAYERS = _redis_cfg["CHANNEL_LAYERS"]
CELERY_BROKER_URL = _redis_cfg["CELERY_BROKER_URL"]
CELERY_RESULT_BACKEND = _redis_cfg["CELERY_RESULT_BACKEND"]
SESSION_ENGINE = _redis_cfg.get("SESSION_ENGINE", "django.contrib.sessions.backends.db")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Africa/Kinshasa"

# Authentification
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalisation
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Kinshasa"
USE_I18N = True
USE_TZ = True

# Fichiers statiques & médias
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "frontend" / "static"]

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

_DEFAULT_FILE_BACKEND = (
    "cloudinary_storage.storage.MediaCloudinaryStorage"
    if _cloudinary_configured()
    else "django.core.files.storage.FileSystemStorage"
)

STORAGES = {
    "default": {
        "BACKEND": _DEFAULT_FILE_BACKEND,
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

if _cloudinary_configured():
    CLOUDINARY_STORAGE = _cloudinary_storage_settings()

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "apps.core.throttling.SafeAnonRateThrottle",
        "apps.core.throttling.SafeUserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/hour",
        "user": "2000/hour",
        "login": "10/minute",
        "burst": "60/minute",
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
}

# JWT
JWT_ACCESS_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", "60"))
JWT_REFRESH_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", "7"))

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=JWT_ACCESS_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=JWT_REFRESH_DAYS),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:8000").split(",")
]
CORS_ALLOW_CREDENTIALS = True

# Sécurité
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True
DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024  # 6 Mo max (photos 5 Mo)
FILE_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024

# Auditlog
AUDITLOG_INCLUDE_ALL_MODELS = False

# Famille Patience — paramètres métier
MAX_ATTENDANCE_AGENTS_PER_EVENT = 5
