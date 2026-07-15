"""A minimal shared-password gate (HTTP Basic Auth).

Enabled only when BASIC_AUTH_USER is configured (production). It protects the
whole app — the SPA and the API — with one shared username/password delivered
over HTTPS. /api/health/ is left open so uptime pings work. This is a
lightweight "only people I invite" gate, not a real user system.
"""
from __future__ import annotations

import base64
import hmac

from django.conf import settings
from django.http import HttpResponse

_OPEN_PATHS = {"/api/health/"}


def _credentials_ok(header: str) -> bool:
    if not header.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(header[6:]).decode("utf-8")
    except Exception:
        return False
    user, _, password = decoded.partition(":")
    # constant-time comparison
    return hmac.compare_digest(user, settings.BASIC_AUTH_USER) and hmac.compare_digest(
        password, settings.BASIC_AUTH_PASS
    )


class BasicAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = bool(settings.BASIC_AUTH_USER)

    def __call__(self, request):
        if self.enabled and request.path not in _OPEN_PATHS:
            header = request.META.get("HTTP_AUTHORIZATION", "")
            if not _credentials_ok(header):
                resp = HttpResponse("Authentification requise", status=401)
                resp["WWW-Authenticate"] = 'Basic realm="GesParc", charset="UTF-8"'
                return resp
        return self.get_response(request)
