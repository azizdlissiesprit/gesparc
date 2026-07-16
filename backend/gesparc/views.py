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
def bon_commande_list(request: Request) -> Response:
    data = queries.list_bons_commande(
        search=request.query_params.get("search") or None,
        num_fourn=request.query_params.get("num_fourn") or None,
        statut=request.query_params.get("statut") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def bon_commande_stats(request: Request) -> Response:
    return Response(queries.bons_commande_stats())


@api_view(["GET"])
def bon_commande_detail(request: Request, reference: str) -> Response:
    row = queries.get_bon_commande(reference)
    if row is None:
        return Response({"detail": "Bon de commande introuvable"}, status=404)
    return Response(row)


@api_view(["GET"])
def article_list(request: Request) -> Response:
    data = queries.list_articles(
        search=request.query_params.get("search") or None,
        marque=_int_param(request, "marque"),
        statut=request.query_params.get("statut") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def article_stats(request: Request) -> Response:
    return Response(queries.articles_stats())


@api_view(["GET"])
def article_detail(request: Request, code: str) -> Response:
    row = queries.get_article(code)
    if row is None:
        return Response({"detail": "Article introuvable"}, status=404)
    return Response(row)


@api_view(["GET"])
def ordre_mission_list(request: Request) -> Response:
    data = queries.list_ordres_mission(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        statut=request.query_params.get("statut") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def ordre_mission_stats(request: Request) -> Response:
    return Response(queries.ordres_mission_stats())


@api_view(["GET"])
def ordre_mission_detail(request: Request, num_om: int) -> Response:
    row = queries.get_ordre_mission(num_om)
    if row is None:
        return Response({"detail": "Ordre de mission introuvable"}, status=404)
    return Response(row)


@api_view(["GET"])
def fournisseur_list(request: Request) -> Response:
    data = queries.list_fournisseurs(
        search=request.query_params.get("search") or None,
        statut=request.query_params.get("statut") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def fournisseur_stats(request: Request) -> Response:
    return Response(queries.fournisseurs_stats())


@api_view(["GET"])
def fournisseur_detail(request: Request, code: str) -> Response:
    row = queries.get_fournisseur(code)
    if row is None:
        return Response({"detail": "Fournisseur introuvable"}, status=404)
    return Response(row)


@api_view(["GET"])
def sinistre_list(request: Request) -> Response:
    data = queries.list_sinistres(
        search=request.query_params.get("search") or None,
        nature=_int_param(request, "nature"),
        statut=request.query_params.get("statut") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def sinistre_stats(request: Request) -> Response:
    return Response(queries.sinistres_stats())


@api_view(["GET"])
def sinistre_detail(request: Request, num_sin: str) -> Response:
    row = queries.get_sinistre(num_sin)
    if row is None:
        return Response({"detail": "Sinistre introuvable"}, status=404)
    return Response(row)


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
    if name == "fournisseurs":
        return Response(
            queries.lookup_fournisseurs(
                search=request.query_params.get("search") or None,
                limit=_int_param(request, "limit", 50),
            )
        )
    return Response({"detail": f"Lookup inconnu: {name}"}, status=404)
