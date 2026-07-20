"""DRF API views for GesParc. Thin HTTP layer over gesparc.queries."""
from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from . import db, export, queries


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
        categorie=request.query_params.get("categorie") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
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
def vehicle_360(request: Request, num_veh: str) -> Response:
    """Everything about one vehicle: identity, costs, usage and events."""
    data = queries.vehicle_360(num_veh)
    if data is None:
        return Response({"detail": "Véhicule introuvable"}, status=404)
    return Response(data)


@api_view(["GET"])
def visite_technique_list(request: Request) -> Response:
    data = queries.list_visites_techniques(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        statut=request.query_params.get("statut") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def visite_technique_stats(request: Request) -> Response:
    return Response(queries.visites_techniques_stats())


@api_view(["GET"])
def taxe_circulation_list(request: Request) -> Response:
    data = queries.list_taxes_circulation(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        nature=_int_param(request, "nature"),
        statut=request.query_params.get("statut") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def taxe_circulation_stats(request: Request) -> Response:
    return Response(queries.taxes_circulation_stats())


@api_view(["GET"])
def reforme_list(request: Request) -> Response:
    data = queries.list_reformes(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        statut=request.query_params.get("statut") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
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
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def bon_travail_stats(request: Request) -> Response:
    return Response(queries.bons_travail_stats())


@api_view(["GET"])
def bon_travail_par_atelier(request: Request) -> Response:
    return Response(queries.bons_travail_par_atelier())


@api_view(["GET"])
def bon_travail_par_magasin(request: Request) -> Response:
    return Response(queries.bons_travail_par_magasin())


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
        num_parc=request.query_params.get("num_parc") or None,
        genre=request.query_params.get("genre") or None,
        statut=request.query_params.get("statut") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def demande_stats(request: Request) -> Response:
    return Response(queries.demandes_stats())


@api_view(["GET"])
def demande_par_ugp(request: Request) -> Response:
    return Response(queries.demandes_par_ugp())


@api_view(["GET"])
def bon_commande_list(request: Request) -> Response:
    data = queries.list_bons_commande(
        search=request.query_params.get("search") or None,
        num_fourn=request.query_params.get("num_fourn") or None,
        num_parc=request.query_params.get("num_parc") or None,
        article=request.query_params.get("article") or None,
        statut=request.query_params.get("statut") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
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
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
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
def mouvement_stock_list(request: Request) -> Response:
    data = queries.list_mouvements_stock(
        search=request.query_params.get("search") or None,
        type_mvt=_int_param(request, "type_mvt"),
        article=request.query_params.get("article") or None,
        num_parc=request.query_params.get("num_parc") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def mouvement_stock_stats(request: Request) -> Response:
    return Response(queries.mouvements_stock_stats())


@api_view(["GET"])
def bon_sortie_list(request: Request) -> Response:
    data = queries.list_bons_sortie(
        search=request.query_params.get("search") or None,
        mode=request.query_params.get("mode") or None,
        num_mag=request.query_params.get("num_mag") or None,
        num_parc=request.query_params.get("num_parc") or None,
        article=request.query_params.get("article") or None,
        num_veh=request.query_params.get("num_veh") or None,
        statut=request.query_params.get("statut") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def bon_sortie_stats(request: Request) -> Response:
    return Response(queries.bons_sortie_stats())


@api_view(["GET"])
def bon_sortie_breakdown(request: Request) -> Response:
    return Response(queries.bons_sortie_breakdown())


@api_view(["GET"])
def reception_list(request: Request) -> Response:
    data = queries.list_receptions(
        search=request.query_params.get("search") or None,
        num_fourn=request.query_params.get("num_fourn") or None,
        num_parc=request.query_params.get("num_parc") or None,
        article=request.query_params.get("article") or None,
        statut=request.query_params.get("statut") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def reception_stats(request: Request) -> Response:
    return Response(queries.receptions_stats())


@api_view(["GET"])
def reception_breakdown(request: Request) -> Response:
    return Response(queries.receptions_breakdown())


@api_view(["GET"])
def ordre_mission_list(request: Request) -> Response:
    data = queries.list_ordres_mission(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        statut=request.query_params.get("statut") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
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
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
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
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
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
def exploitation_list(request: Request) -> Response:
    data = queries.list_exploitation(
        search=request.query_params.get("search") or None,
        annee=_int_param(request, "annee"),
        mois=_int_param(request, "mois"),
        num_struct=request.query_params.get("num_struct") or None,
        categorie=request.query_params.get("categorie") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def exploitation_stats(request: Request) -> Response:
    return Response(queries.exploitation_stats())


@api_view(["GET"])
def carburant_list(request: Request) -> Response:
    data = queries.list_carburant(
        search=request.query_params.get("search") or None,
        num_struct=request.query_params.get("num_struct") or None,
        energie=request.query_params.get("energie") or None,
        annee=_int_param(request, "annee"),
        categorie=request.query_params.get("categorie") or None,
        sort=request.query_params.get("sort") or None,
        order=request.query_params.get("order") or None,
        page=_int_param(request, "page", 1),
        page_size=_int_param(request, "page_size", 20),
    )
    return Response(data)


@api_view(["GET"])
def carburant_stats(request: Request) -> Response:
    return Response(queries.carburant_stats())


@api_view(["GET"])
def export_csv(request: Request, resource: str):
    """Stream any list as a filtered CSV — same filters as the screen."""
    try:
        return export.csv_response(request, resource)
    except KeyError:
        return Response({"detail": f"Export inconnu: {resource}"}, status=404)


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
    if name == "parcs":
        return Response(queries.lookup_parcs())
    if name == "articles":
        return Response(
            queries.lookup_articles(
                search=request.query_params.get("search") or None,
                limit=_int_param(request, "limit", 50),
            )
        )
    if name == "exploitation-annees":
        return Response(queries.exploitation_annees())
    if name == "carburant-annees":
        return Response(queries.carburant_annees())
    if name == "taxe-natures":
        return Response(queries.lookup_taxe_natures())
    if name == "mvt-types":
        return Response(queries.lookup_mvt_types())
    if name == "magasins":
        return Response(queries.lookup_magasins())
    return Response({"detail": f"Lookup inconnu: {name}"}, status=404)
