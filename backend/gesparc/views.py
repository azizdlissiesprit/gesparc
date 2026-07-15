"""DRF API views for GesParc. Thin HTTP layer over gesparc.queries."""
from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from . import db, queries


def _int_param(request: Request, name: str, default=None):
    raw = request.query_params.get(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


@api_view(["GET"])
def health(request: Request) -> Response:
    """Simple readiness probe that also confirms database connectivity."""
    try:
        version = db.fetch_scalar("SELECT version()")
        return Response({"status": "ok", "db_version": version})
    except Exception as exc:  # pragma: no cover - diagnostic endpoint
        return Response({"status": "error", "detail": str(exc)}, status=503)


@api_view(["GET"])
def overview(request: Request) -> Response:
    return Response(queries.overview())


@api_view(["GET"])
def vehicle_list(request: Request) -> Response:
    data = queries.list_vehicles(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        etat=_int_param(request, "etat"),
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def vehicle_stats(request: Request) -> Response:
    return Response(queries.vehicle_stats())


@api_view(["GET"])
def vehicle_detail(request: Request, num_veh: str) -> Response:
    row = queries.get_vehicle(num_veh)
    if row is None:
        return Response({"detail": "Véhicule introuvable"}, status=404)
    return Response(row)


@api_view(["GET"])
def visite_technique_list(request: Request) -> Response:
    data = queries.list_visites_techniques(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        statut=request.query_params.get("statut") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def visite_technique_stats(request: Request) -> Response:
    return Response(queries.visites_techniques_stats())


@api_view(["GET"])
def reforme_list(request: Request) -> Response:
    data = queries.list_reformes(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        statut=request.query_params.get("statut") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def reforme_stats(request: Request) -> Response:
    return Response(queries.reformes_stats())


@api_view(["GET"])
def bon_travail_list(request: Request) -> Response:
    data = queries.list_bons_travail(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        nature=request.query_params.get("nature") or None,
        mode=request.query_params.get("mode") or None,
        etat=request.query_params.get("etat") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def bon_travail_stats(request: Request) -> Response:
    return Response(queries.bons_travail_stats())


@api_view(["GET"])
def bon_travail_detail(request: Request, reference: str) -> Response:
    row = queries.get_bon_travail(reference)
    if row is None:
        return Response({"detail": "Bon de travail introuvable"}, status=404)
    return Response(row)


@api_view(["GET"])
def demande_list(request: Request) -> Response:
    data = queries.list_demandes(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        statut=request.query_params.get("statut") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def demande_stats(request: Request) -> Response:
    return Response(queries.demandes_stats())


@api_view(["GET"])
def lookups(request: Request, name: str) -> Response:
    """Reference-data endpoint: /api/lookups/<name>/."""
    if name == "marques":
        return Response(queries.lookup_marques())
    if name == "genres":
        return Response(queries.lookup_genres())
    if name == "energies":
        return Response(queries.lookup_energies())
    if name == "usages":
        return Response(queries.lookup_usages())
    if name == "etats":
        return Response(queries.lookup_etats())
    if name == "types":
        return Response(queries.lookup_types(_int_param(request, "marque")))
    if name == "structures":
        return Response(
            queries.lookup_structures(
                search=request.query_params.get("search") or None,
                limit=_int_param(request, "limit", 50),
            )
        )
    return Response({"detail": f"Lookup inconnu: {name}"}, status=404)
