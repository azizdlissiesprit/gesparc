"""
Django settings for the GesParc admin dashboard backend.

Note: business data lives in PostgreSQL and is accessed via raw psycopg
(see gesparc/db.py), NOT the Django ORM. The `default` database below is a
local SQLite file used only for Django's own internals. In production Django
also serves the built React SPA (WhiteNoise) so the whole app is one service.
"""
from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
# Repo root (one level above backend/), where frontend/ lives.
REPO_DIR = BASE_DIR.parent

# Load .env from the backend root (local dev; on hosts, real env vars are used).
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() in ("1", "true", "yes")
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",  # required by DRF (AnonymousUser / permissions), no login used
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "gesparc",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serves the built SPA assets
    "gesparc.middleware.BasicAuthMiddleware",  # simple shared-password gate (prod)
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Django's own internal storage only. Business data is in Oracle (raw driver).
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "django_internal.sqlite3",
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "UNICODE_JSON": True,
}

# CORS — allow the Vite dev server (prod is same-origin, so CORS is unused).
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ALLOWED_ORIGINS", "http://localhost:5173"
    ).split(",")
    if o.strip()
]

# Trust the deployment origin for CSRF (e.g. https://gesparc.onrender.com).
CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",")
    if o.strip()
]

# --- Basic Auth gate (production) ---
# When BASIC_AUTH_USER is set, every request (except /api/health/) requires
# these shared credentials. Leave empty in local dev to disable the gate.
BASIC_AUTH_USER = os.environ.get("BASIC_AUTH_USER", "")
BASIC_AUTH_PASS = os.environ.get("BASIC_AUTH_PASS", "")

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Tunis"
USE_I18N = True
USE_TZ = True

# --- Static files & the built SPA (WhiteNoise) ---
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# The Vite build (frontend/dist) is collected into STATIC_ROOT so Django can
# serve the SPA and its assets. Only include it if it has been built.
_frontend_dist = REPO_DIR / "frontend" / "dist"
STATICFILES_DIRS = [_frontend_dist] if _frontend_dist.exists() else []
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

# Behind a TLS-terminating proxy (Render) — honor X-Forwarded-Proto.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
