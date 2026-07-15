"""Root URL configuration for the GesParc backend.

In production Django serves both the API (/api/) and the built React SPA
(everything else → index.html, so client-side routing works). WhiteNoise
serves the hashed assets under /static/.
"""
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, JsonResponse
from django.urls import include, path, re_path


def spa(_request):
    """Serve the SPA entry point, or a small JSON banner if not built (dev)."""
    index = Path(settings.STATIC_ROOT) / "index.html"
    if index.exists():
        return FileResponse(open(index, "rb"), content_type="text/html")
    return JsonResponse(
        {"service": "gesparc-api", "docs": "/api/", "health": "/api/health/"}
    )


urlpatterns = [
    path("api/", include("gesparc.urls")),
    # Everything that isn't /api/ or /static/ returns the SPA shell.
    re_path(r"^(?!api/|static/).*$", spa),
]
