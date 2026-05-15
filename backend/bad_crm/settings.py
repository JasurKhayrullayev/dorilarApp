import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
# Har doim backend/.env (manage.py qaysi papkadan ishga tushishidan qat'i nazar)
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"


def _parse_allowed_hosts(raw: str) -> list[str]:
    """ALLOWED_HOSTS — faqat domen (https:// yo'q). CORS_ORIGINS bilan aralashtirmang."""
    out: list[str] = []
    for part in raw.split(","):
        h = part.strip()
        if not h:
            continue
        for prefix in ("https://", "http://"):
            if h.lower().startswith(prefix):
                h = h[len(prefix) :]
        h = h.split("/")[0].strip()
        if h:
            out.append(h)
    return out


ALLOWED_HOSTS = _parse_allowed_hosts(
    os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "crm",
]

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
]

ROOT_URLCONF = "bad_crm.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
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

WSGI_APPLICATION = "bad_crm.wsgi.application"

_database_url = os.getenv("DATABASE_URL", "").strip()
_use_sqlite_raw = os.getenv("USE_SQLITE", "").strip().lower()
if _use_sqlite_raw in ("1", "true", "yes"):
    _use_sqlite = True
elif _use_sqlite_raw in ("0", "false", "no"):
    _use_sqlite = False
else:
    # USE_SQLITE qoldirilmagan: mahalliy DEBUG + tashqi DB URL yo'q → SQLite (Postgres "refused" oldini olish)
    _use_sqlite = DEBUG and not _database_url

if _use_sqlite:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
elif _database_url:
    import dj_database_url

    DATABASES = {
        "default": dj_database_url.config(
            default=_database_url,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "bad_crm"),
            "USER": os.getenv("POSTGRES_USER", "bad_crm"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "bad_crm"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "uz"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "crm.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=24),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://127.0.0.1",
    ).split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

# Vercel preview / production *.vercel.app — ro'yxatga har safar qo'shish noqulay bo'lsa (ixtiyoriy):
# CORS_VERCEL_APP_REGEX=1  (.env yoki Render env)
if os.getenv("CORS_VERCEL_APP_REGEX", "").strip().lower() in ("1", "true", "yes"):
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^https://[\w.-]+\.vercel\.app$",
    ]

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "bad-crm",
    }
}
if os.getenv("REDIS_URL"):
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1"),
            "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        }
    }

LOGIN_FAIL_CACHE_PREFIX = "login_fail:"
