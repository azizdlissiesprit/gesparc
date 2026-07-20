"""CSV export shared by every list endpoint.

Design notes
------------
* **Server-side and filter-aware.** An export runs the *same* ``list_*``
  function the screen uses, so what you download is exactly what you filtered.
  The parameter names live in one declarative registry below, which is what
  keeps the export from silently drifting away from the list endpoint.
* **Streamed in bounded memory.** Rows are pulled page by page and written
  straight to the response, so a big export never materialises in RAM.
* **Localised for Excel (fr).** UTF-8 BOM + ``;`` delimiter + comma decimal
  separator, so accented text and numbers open correctly in a French/Tunisian
  Excel without going through the import wizard.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Callable, Iterator, Sequence

from django.http import StreamingHttpResponse

from . import queries

# Rows are fetched in pages of this size (the data layer's own cap).
CHUNK = 500
# An export follows filtering; this bound keeps a worker from being tied up by
# an unfiltered 218k-row pull. Surfaced in the UI so it is never a surprise.
MAX_ROWS = 20_000

Column = tuple[str, str] | tuple[str, str, Callable[[Any], Any]]


@dataclass(frozen=True)
class Export:
    """One exportable list: how to fetch it, and what to write."""

    fn: Callable[..., dict]
    filename: str
    columns: Sequence[Column]
    str_params: Sequence[str] = field(default_factory=tuple)
    int_params: Sequence[str] = field(default_factory=tuple)


CATEGORIE_LABELS = {"vehicule": "Véhicule", "groupe_electrogene": "Groupe électrogène"}
_categorie = lambda v: CATEGORIE_LABELS.get(v, v or "")  # noqa: E731


EXPORTS: dict[str, Export] = {
    "vehicules": Export(
        fn=queries.list_vehicles,
        filename="vehicules",
        str_params=("search", "num_struct", "categorie"),
        int_params=("etat",),
        columns=(
            ("num_plaque", "N° plaque"),
            ("categorie", "Catégorie", _categorie),
            ("marque", "Marque"),
            ("type", "Type"),
            ("genre", "Genre"),
            ("energie", "Énergie"),
            ("structure", "Structure"),
            ("beneficiaire", "Bénéficiaire"),
            ("etat", "État"),
            ("index_km", "Index KM"),
            ("age_veh", "Âge (ans)"),
        ),
    ),
    "visites-techniques": Export(
        fn=queries.list_visites_techniques,
        filename="visites-techniques",
        str_params=("search", "num_struct", "statut"),
        columns=(
            ("num_plaque", "N° plaque"),
            ("structure", "Structure"),
            ("date_debut", "Début validité"),
            ("date_fin", "Fin validité"),
            ("montant", "Montant (TND)"),
            ("quittance", "Quittance"),
            ("statut", "Statut"),
        ),
    ),
    "taxes-circulation": Export(
        fn=queries.list_taxes_circulation,
        filename="taxes-circulation",
        str_params=("search", "num_struct", "statut"),
        int_params=("nature",),
        columns=(
            ("num_plaque", "N° plaque"),
            ("nature", "Nature"),
            ("structure", "Structure"),
            ("date_debut", "Début validité"),
            ("date_fin", "Fin validité"),
            ("montant", "Montant (TND)"),
            ("quittance", "Quittance"),
            ("statut", "Statut"),
        ),
    ),
    "reformes": Export(
        fn=queries.list_reformes,
        filename="reformes",
        str_params=("search", "num_struct", "statut"),
        columns=(
            ("num_plaque", "N° plaque"),
            ("reference", "Référence"),
            ("date_reforme", "Date réforme"),
            ("date_vente", "Date vente"),
            ("prix_vente", "Prix vente (TND)"),
            ("cause", "Cause"),
            ("structure", "Structure"),
            ("statut", "Statut"),
        ),
    ),
    "demandes": Export(
        fn=queries.list_demandes,
        filename="demandes-intervention",
        str_params=("search", "num_struct", "num_parc", "genre", "statut"),
        columns=(
            ("reference", "Référence"),
            ("date_demande", "Date demande"),
            ("num_plaque", "Véhicule"),
            ("structure", "Structure"),
            ("parc", "Parc / UGP"),
            ("genre", "Type véhicule"),
            ("demandeur", "Demandeur"),
            ("statut", "Statut"),
            ("date_rdv", "Rendez-vous"),
        ),
    ),
    "bons-travail": Export(
        fn=queries.list_bons_travail,
        filename="bons-travail",
        str_params=("search", "num_struct", "nature", "mode", "etat"),
        columns=(
            ("reference", "Référence"),
            ("num_plaque", "Véhicule"),
            ("structure", "Structure"),
            ("nature", "Nature"),
            ("mode", "Mode"),
            ("date_entree", "Date entrée"),
            ("date_sortie", "Date sortie"),
            ("etat", "État"),
            ("cout", "Coût (TND)"),
        ),
    ),
    "bons-commande": Export(
        fn=queries.list_bons_commande,
        filename="bons-commande",
        str_params=("search", "num_fourn", "num_parc", "article", "statut"),
        columns=(
            ("reference", "Référence"),
            ("date_creation", "Date création"),
            ("fournisseur", "Fournisseur"),
            ("parc", "Parc / UGP"),
            ("nb_articles", "Nb articles"),
            ("montant", "Montant (TND)"),
            ("statut", "Statut"),
        ),
    ),
    "articles": Export(
        fn=queries.list_articles,
        filename="articles-stock",
        str_params=("search", "statut"),
        int_params=("marque",),
        columns=(
            ("code", "Code"),
            ("designation", "Désignation"),
            ("ref_constructeur", "Réf. constructeur"),
            ("genre", "Genre"),
            ("marque", "Marque"),
            ("type", "Type"),
            ("prix", "Prix (TND)"),
            ("qte_stock", "Qté en stock"),
        ),
    ),
    "mouvements-stock": Export(
        fn=queries.list_mouvements_stock,
        filename="regulation-stock",
        str_params=("search", "article", "num_parc"),
        int_params=("type_mvt",),
        columns=(
            ("date_piece", "Date"),
            ("type", "Type mouvement"),
            ("num_article", "Code article"),
            ("article", "Désignation"),
            ("quantite", "Quantité"),
            ("parc", "Parc / UGP"),
            ("beneficiaire", "Bénéficiaire"),
            ("nat_benef", "Nature bénéficiaire"),
        ),
    ),
    "bons-sortie": Export(
        fn=queries.list_bons_sortie,
        filename="bons-sortie",
        str_params=(
            "search", "mode", "num_mag", "num_parc", "article", "num_veh", "statut",
        ),
        columns=(
            ("num_piece", "Bon de sortie"),
            ("date_piece", "Date"),
            ("num_bt_int", "Bon de travail"),
            ("mode", "Mode"),
            ("magasin", "Magasin"),
            ("parc", "Parc / UGP"),
            ("num_veh", "Série véhicule"),
            ("statut", "Statut"),
            ("nb_articles", "Nb articles"),
            ("montant", "Montant (TND)"),
        ),
    ),
    "receptions": Export(
        fn=queries.list_receptions,
        filename="receptions-fournisseur",
        str_params=("search", "num_fourn", "num_parc", "article", "statut"),
        columns=(
            ("num_piece", "Réception"),
            ("date_piece", "Date"),
            ("fournisseur", "Fournisseur"),
            ("ref_bc", "Réf. BC"),
            ("statut", "Statut"),
            ("parc", "Parc / UGP"),
            ("nb_articles", "Nb articles"),
            ("montant", "Montant (TND)"),
        ),
    ),
    "ordres-mission": Export(
        fn=queries.list_ordres_mission,
        filename="ordres-mission",
        str_params=("search", "num_struct", "statut"),
        columns=(
            ("num_om", "N° OM"),
            ("num_plaque", "Véhicule"),
            ("structure", "Structure"),
            ("conducteur", "Conducteur"),
            ("destination", "Destination"),
            ("date_om", "Date OM"),
            ("date_depart", "Départ"),
            ("date_fin", "Fin"),
            ("km_depart", "Km départ"),
            ("km_retour", "Km retour"),
            ("statut", "Statut"),
        ),
    ),
    "fournisseurs": Export(
        fn=queries.list_fournisseurs,
        filename="fournisseurs",
        str_params=("search", "statut"),
        columns=(
            ("code", "Code"),
            ("designation", "Désignation"),
            ("activite", "Activité"),
            ("adresse", "Adresse"),
            ("tel", "Téléphone"),
            ("email", "E-mail"),
            ("statut", "Statut"),
        ),
    ),
    "sinistres": Export(
        fn=queries.list_sinistres,
        filename="sinistres",
        str_params=("search", "statut"),
        int_params=("nature",),
        columns=(
            ("num_sin", "N° sinistre"),
            ("num_plaque", "Véhicule"),
            ("structure", "Structure"),
            ("cause", "Cause"),
            ("nature", "Nature"),
            ("date_sinistre", "Date sinistre"),
            ("lieu_sinistre", "Lieu"),
            ("tiers", "Tiers"),
            ("montant_rep", "Montant réparation (TND)"),
            ("montant_indem", "Montant indemnité (TND)"),
            ("statut", "Statut"),
        ),
    ),
    "exploitation": Export(
        fn=queries.list_exploitation,
        filename="exploitation",
        str_params=("search", "num_struct", "categorie"),
        int_params=("annee", "mois"),
        columns=(
            ("annee", "Année"),
            ("mois", "Mois"),
            ("num_plaque", "Véhicule"),
            ("categorie", "Type", _categorie),
            ("structure", "Structure"),
            ("energie", "Énergie"),
            ("index_km", "Index KM"),
            ("km_parcourus", "Km parcourus"),
            ("carburant_consomme", "Carburant consommé (L)"),
            ("cmck", "Conso. /100km"),
        ),
    ),
    "carburant": Export(
        fn=queries.list_carburant,
        filename="carburant",
        str_params=("search", "num_struct", "energie", "categorie"),
        int_params=("annee",),
        columns=(
            ("date_piece", "Date"),
            ("num_plaque", "Véhicule"),
            ("categorie", "Type", _categorie),
            ("structure", "Structure"),
            ("beneficiaire", "Bénéficiaire"),
            ("energie", "Énergie"),
            ("quantite", "Quantité (L)"),
            ("prix_unitaire", "Prix unitaire"),
            ("montant", "Montant (TND)"),
            ("type", "Type ligne"),
        ),
    ),
}


def _cell(value: Any) -> str:
    """Render one value for a French Excel: dd/mm/yyyy dates, comma decimals."""
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    if isinstance(value, (Decimal, float)):
        # Trim to 3 decimals, drop trailing zeros, then localise the separator.
        text = f"{float(value):.3f}".rstrip("0").rstrip(".")
        return text.replace(".", ",")
    if isinstance(value, int):
        return str(value)
    return str(value).strip()


class _Echo:
    """A file-like object that just returns what is written to it."""

    def write(self, value: str) -> str:
        return value


def _kwargs_from(request, spec: Export) -> dict[str, Any]:
    """Build the list_* kwargs from the request, per the registry declaration."""
    kwargs: dict[str, Any] = {}
    for name in spec.str_params:
        kwargs[name] = request.query_params.get(name) or None
    for name in spec.int_params:
        raw = request.query_params.get(name)
        try:
            kwargs[name] = int(raw) if raw not in (None, "") else None
        except (TypeError, ValueError):
            kwargs[name] = None
    return kwargs


def _rows(spec: Export, kwargs: dict[str, Any]) -> Iterator[list[str]]:
    """Yield the header then every row, pulling pages of CHUNK as we go."""
    writer = csv.writer(_Echo(), delimiter=";", quoting=csv.QUOTE_MINIMAL,
                        lineterminator="\r\n")
    # BOM first so Excel detects UTF-8 and renders accents correctly.
    yield "﻿" + writer.writerow([header for _, header, *_ in spec.columns])

    sent = 0
    page = 1
    while sent < MAX_ROWS:
        batch = spec.fn(**kwargs, page=page, page_size=CHUNK)["results"]
        if not batch:
            break
        for row in batch:
            if sent >= MAX_ROWS:
                break
            out = []
            for col in spec.columns:
                key, mapper = col[0], (col[2] if len(col) > 2 else None)
                value = row.get(key)
                out.append(_cell(mapper(value) if mapper else value))
            yield writer.writerow(out)
            sent += 1
        if len(batch) < CHUNK:
            break
        page += 1


def csv_response(request, resource: str) -> StreamingHttpResponse:
    """Stream `resource` as a filtered CSV, or raise KeyError if unknown."""
    spec = EXPORTS[resource]
    kwargs = _kwargs_from(request, spec)
    stamp = datetime.now().strftime("%Y%m%d")
    response = StreamingHttpResponse(
        _rows(spec, kwargs), content_type="text/csv; charset=utf-8"
    )
    response["Content-Disposition"] = (
        f'attachment; filename="gesparc-{spec.filename}-{stamp}.csv"'
    )
    response["Cache-Control"] = "no-store"
    return response
