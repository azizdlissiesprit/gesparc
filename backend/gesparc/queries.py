"""SQL queries for the GesParc API (PostgreSQL)."""
from __future__ import annotations

from typing import Any

from . import db as oracle

# Vehicle status codes as computed by the V_GESPARC_VEHICULE view.
ETAT_LABELS: dict[int, str] = {
    1: "en circulation",
    2: "en réparation",
    3: "emprunté",
    4: "sinistré",
    5: "réformé",
    6: "vendu",
}

# Base projection for the vehicle list: the canonical view (which computes
# etat / benef / age / latest km) joined to the label lookups.
_VEHICLE_LIST_BASE = """
SELECT v.num_veh              AS num_veh,
       v.num_plaque           AS num_plaque,
       v.marque               AS marque_code,
       mv.designation         AS marque,
       v.type                 AS type_code,
       v.ref_type             AS ref_type,
       tv.designation         AS type,
       v.genre                AS genre_code,
       gv.designation         AS genre,
       v.energie              AS energie_code,
       et.designation         AS energie,
       v.num_struct           AS num_struct,
       st.designation         AS structure,
       v.iu                   AS iu,
       v.benef                AS beneficiaire,
       v.etat_vehicule        AS etat_code,
       v.index_km             AS index_km,
       v.age_veh              AS age_veh,
       -- Marque "GE" = Groupe Électrogène (stationary generator), not a road vehicle.
       CASE WHEN TRIM(mv.designation) = 'GE' THEN 'groupe_electrogene'
            ELSE 'vehicule' END AS categorie
FROM v_gesparc_vehicule v
LEFT JOIN marque_vehicule mv ON mv.marque = v.marque
LEFT JOIN genre_vehicule  gv ON gv.genre  = v.genre
LEFT JOIN type_vehicule   tv ON tv.type   = v.type AND tv.marque = v.marque
LEFT JOIN energie_tab     et ON et.energie = v.energie::text
LEFT JOIN structure       st ON st.num_struct = v.num_struct
"""


def _add_etat_label(row: dict[str, Any]) -> dict[str, Any]:
    code = row.get("etat_code")
    row["etat"] = ETAT_LABELS.get(int(code), None) if code is not None else None
    return row


def list_vehicles(
    *,
    search: str | None = None,
    num_struct: str | None = None,
    etat: int | None = None,
    categorie: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}

    if search:
        where.append(
            "(UPPER(v.num_plaque) LIKE :search "
            "OR UPPER(mv.designation) LIKE :search "
            "OR UPPER(st.designation) LIKE :search "
            "OR UPPER(v.benef) LIKE :search "
            "OR UPPER(v.num_veh) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_struct:
        where.append("v.num_struct = :num_struct")
        params["num_struct"] = num_struct
    if etat is not None:
        where.append("v.etat_vehicule = :etat")
        params["etat"] = etat
    if categorie == "groupe_electrogene":
        where.append("TRIM(mv.designation) = 'GE'")
    elif categorie == "vehicule":
        where.append("COALESCE(TRIM(mv.designation), '') <> 'GE'")

    inner = _VEHICLE_LIST_BASE
    if where:
        inner += " WHERE " + " AND ".join(where)

    # The canonical view can emit >1 row for a vehicle whose IU matches
    # several personnel (a legacy data quirk). Collapse to one row per
    # vehicle so counts and pagination stay exact.
    base = (
        "SELECT vq.* FROM ("
        "  SELECT q.*, ROW_NUMBER() OVER "
        "         (PARTITION BY q.num_veh ORDER BY q.beneficiaire) AS rnk__ "
        f"  FROM ({inner}) q"
        ") vq WHERE vq.rnk__ = 1"
    )

    result = oracle.paginate(
        base, params, page=page, page_size=page_size, order_by="num_plaque ASC"
    )
    for r in result["results"]:
        r.pop("rnk__", None)
    result["results"] = [_add_etat_label(r) for r in result["results"]]
    return result


def get_vehicle(num_veh: str) -> dict[str, Any] | None:
    """Full vehicle row with resolved labels for the edit form."""
    row = oracle.fetch_one(
        """
        SELECT v.*,
               mv.designation AS marque_lib,
               gv.designation AS genre_lib,
               tv.designation AS type_lib,
               et.designation AS energie_lib,
               st.designation AS structure_lib,
               u.designation  AS usage_lib
        FROM vehicule v
        LEFT JOIN marque_vehicule mv ON mv.marque = v.marque
        LEFT JOIN genre_vehicule  gv ON gv.genre  = v.genre
        LEFT JOIN type_vehicule   tv ON tv.type   = v.type AND tv.marque = v.marque
        LEFT JOIN energie_tab     et ON et.energie = v.energie::text
        LEFT JOIN structure       st ON st.num_struct = v.num_struct
        LEFT JOIN usage_veh       u  ON u.num_usage = v.num_usage
        WHERE v.num_veh = :num_veh
        """,
        {"num_veh": num_veh},
    )
    if row:
        # Attach the computed status from the view (etat/benef/latest km).
        extra = oracle.fetch_one(
            "SELECT etat_vehicule, benef, index_km, age_veh "
            "FROM v_gesparc_vehicule WHERE num_veh = :num_veh",
            {"num_veh": num_veh},
        )
        if extra:
            row["etat_code"] = extra["etat_vehicule"]
            row["etat"] = ETAT_LABELS.get(int(extra["etat_vehicule"]), None)
            row["beneficiaire"] = extra["benef"]
            row["index_km_actuel"] = extra["index_km"]
            row["age_veh"] = extra["age_veh"]
    return row


def vehicle_stats() -> dict[str, Any]:
    total = oracle.fetch_scalar("SELECT COUNT(*) FROM vehicule")
    by_etat = oracle.fetch_all(
        "SELECT etat_vehicule AS etat_code, COUNT(*) AS n "
        "FROM v_gesparc_vehicule GROUP BY etat_vehicule ORDER BY etat_vehicule"
    )
    for r in by_etat:
        r["etat"] = ETAT_LABELS.get(int(r["etat_code"]), str(r["etat_code"]))
    by_energie = oracle.fetch_all(
        """
        SELECT et.designation AS energie, COUNT(*) AS n
        FROM vehicule v
        LEFT JOIN energie_tab et ON et.energie = v.energie::text
        GROUP BY et.designation ORDER BY n DESC
        """
    )
    by_marque = oracle.fetch_all(
        """
        SELECT mv.designation AS marque, COUNT(*) AS n
        FROM vehicule v
        LEFT JOIN marque_vehicule mv ON mv.marque = v.marque
        GROUP BY mv.designation ORDER BY n DESC
        LIMIT 10
        """
    )
    return {
        "total": total,
        "by_etat": by_etat,
        "by_energie": by_energie,
        "by_marque": by_marque,
    }


# ---- Lookups (reference data for filters and edit forms) -------------------

def lookup_marques() -> list[dict]:
    return oracle.fetch_all(
        "SELECT marque AS value, designation AS label "
        "FROM marque_vehicule ORDER BY designation"
    )


def lookup_genres() -> list[dict]:
    return oracle.fetch_all(
        "SELECT genre AS value, designation AS label "
        "FROM genre_vehicule ORDER BY designation"
    )


def lookup_energies() -> list[dict]:
    return oracle.fetch_all(
        "SELECT energie AS value, designation AS label "
        "FROM energie_tab ORDER BY designation"
    )


def lookup_usages() -> list[dict]:
    return oracle.fetch_all(
        "SELECT num_usage AS value, designation AS label "
        "FROM usage_veh ORDER BY designation"
    )


def lookup_types(marque: int | None = None) -> list[dict]:
    if marque is not None:
        return oracle.fetch_all(
            "SELECT type AS value, designation AS label "
            "FROM type_vehicule WHERE marque = :marque ORDER BY designation",
            {"marque": marque},
        )
    return oracle.fetch_all(
        "SELECT type AS value, designation AS label, marque "
        "FROM type_vehicule ORDER BY designation"
    )


def lookup_structures(search: str | None = None, limit: int = 50) -> list[dict]:
    if search:
        return oracle.fetch_all(
            """
            SELECT num_struct AS value, designation AS label
            FROM structure
            WHERE UPPER(designation) LIKE :search OR num_struct LIKE :search
            ORDER BY designation
            LIMIT :limit
            """,
            {"search": f"%{search.upper()}%", "limit": limit},
        )
    return oracle.fetch_all(
        """
        SELECT num_struct AS value, designation AS label
        FROM structure ORDER BY designation
        LIMIT :limit
        """,
        {"limit": limit},
    )


def lookup_etats() -> list[dict]:
    return [{"value": k, "label": v} for k, v in ETAT_LABELS.items()]


# ---- Frais divers / Visites techniques -------------------------------------
# FRAIS_DIVERS stores several kinds of per-vehicle fees, discriminated by
# NAT_FD. NAT_FD = 4 is the "visite technique" (technical inspection); its
# DATE_FD is the validity start and DATE_VALID_FD the validity end.
NAT_FD_VISITE_TECHNIQUE = 4

# Validity-status conditions (evaluated against the Oracle server date).
_STATUT_CONDS = {
    "expiree": "fd.date_valid_fd < CURRENT_DATE",
    "bientot": "fd.date_valid_fd >= CURRENT_DATE AND fd.date_valid_fd < CURRENT_DATE + 30",
    "valide": "fd.date_valid_fd >= CURRENT_DATE + 30",
    "inconnu": "fd.date_valid_fd IS NULL",
}

_VISITE_BASE = """
SELECT v.num_plaque                                     AS num_plaque,
       fd.num_veh                                       AS num_veh,
       v.num_struct                                     AS num_struct,
       s.designation                                    AS structure,
       fd.montant                                       AS montant,
       fd.date_fd                                       AS date_debut,
       fd.date_valid_fd                                 AS date_fin,
       fd.quittance                                     AS quittance,
       concat(fd.num_veh, '_', TO_CHAR(fd.date_fd, 'YYYYMMDD')) AS id,
       CASE
           WHEN fd.date_valid_fd IS NULL THEN 'inconnu'
           WHEN fd.date_valid_fd < CURRENT_DATE THEN 'expiree'
           WHEN fd.date_valid_fd < CURRENT_DATE + 30 THEN 'bientot'
           ELSE 'valide'
       END                                              AS statut
FROM frais_divers fd
JOIN vehicule v ON v.num_veh = fd.num_veh
LEFT JOIN structure s ON s.num_struct = v.num_struct
"""


def list_visites_techniques(
    *,
    search: str | None = None,
    num_struct: str | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where = ["fd.nat_fd = :nat_fd"]
    params: dict[str, Any] = {"nat_fd": NAT_FD_VISITE_TECHNIQUE}

    if search:
        where.append(
            "(UPPER(v.num_plaque) LIKE :search OR UPPER(s.designation) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_struct:
        where.append("v.num_struct = :num_struct")
        params["num_struct"] = num_struct
    if statut in _STATUT_CONDS:
        where.append(f"({_STATUT_CONDS[statut]})")

    base = _VISITE_BASE + " WHERE " + " AND ".join(where)
    return oracle.paginate(
        base, params, page=page, page_size=page_size, order_by="date_fin DESC"
    )


def visites_techniques_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN fd.date_valid_fd < CURRENT_DATE THEN 1 ELSE 0 END) AS expirees,
               SUM(CASE WHEN fd.date_valid_fd >= CURRENT_DATE
                         AND fd.date_valid_fd < CURRENT_DATE + 30 THEN 1 ELSE 0 END) AS bientot,
               SUM(CASE WHEN fd.date_valid_fd >= CURRENT_DATE + 30 THEN 1 ELSE 0 END) AS valides,
               SUM(fd.montant) AS montant_total
        FROM frais_divers fd
        JOIN vehicule v ON v.num_veh = fd.num_veh
        WHERE fd.nat_fd = :nat_fd
        """,
        {"nat_fd": NAT_FD_VISITE_TECHNIQUE},
    )
    return row or {}


# ---- Taxes de circulation --------------------------------------------------
# The circulation-tax natures in FRAIS_DIVERS (per the NAT_FD column comment:
# 1 = Vignette, 2 = Taxe de circulation, 3 = Assurance, 4 = Visite technique).
# This module covers the two road-tax natures; VT has its own module.
TAXE_NATURE_LABELS = {1: "Vignette", 2: "Taxe de circulation"}

_TAXE_BASE = """
SELECT v.num_plaque                                     AS num_plaque,
       fd.num_veh                                       AS num_veh,
       v.num_struct                                     AS num_struct,
       s.designation                                    AS structure,
       fd.nat_fd                                        AS nature_code,
       fd.montant                                       AS montant,
       fd.date_fd                                       AS date_debut,
       fd.date_valid_fd                                 AS date_fin,
       fd.quittance                                     AS quittance,
       concat(fd.num_veh, '_', fd.nat_fd, '_', TO_CHAR(fd.date_fd, 'YYYYMMDD')) AS id,
       CASE
           WHEN fd.date_valid_fd IS NULL THEN 'inconnu'
           WHEN fd.date_valid_fd < CURRENT_DATE THEN 'expiree'
           WHEN fd.date_valid_fd < CURRENT_DATE + 30 THEN 'bientot'
           ELSE 'valide'
       END                                              AS statut
FROM frais_divers fd
JOIN vehicule v ON v.num_veh = fd.num_veh
LEFT JOIN structure s ON s.num_struct = v.num_struct
"""


def _decorate_taxe(row: dict[str, Any]) -> dict[str, Any]:
    code = row.get("nature_code")
    row["nature"] = TAXE_NATURE_LABELS.get(int(code), code) if code is not None else None
    return row


def list_taxes_circulation(
    *,
    search: str | None = None,
    num_struct: str | None = None,
    nature: int | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where = ["fd.nat_fd IN (1, 2)"]
    params: dict[str, Any] = {}
    if search:
        where.append(
            "(UPPER(v.num_plaque) LIKE :search OR UPPER(s.designation) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_struct:
        where.append("v.num_struct = :num_struct")
        params["num_struct"] = num_struct
    if nature is not None:
        where.append("fd.nat_fd = :nature")
        params["nature"] = nature
    if statut in _STATUT_CONDS:
        where.append(f"({_STATUT_CONDS[statut]})")

    base = _TAXE_BASE + " WHERE " + " AND ".join(where)
    result = oracle.paginate(
        base, params, page=page, page_size=page_size,
        order_by="date_fin DESC NULLS LAST",
    )
    result["results"] = [_decorate_taxe(r) for r in result["results"]]
    return result


def taxes_circulation_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN fd.date_valid_fd < CURRENT_DATE THEN 1 ELSE 0 END) AS expirees,
               SUM(CASE WHEN fd.date_valid_fd >= CURRENT_DATE
                         AND fd.date_valid_fd < CURRENT_DATE + 30 THEN 1 ELSE 0 END) AS bientot,
               SUM(CASE WHEN fd.date_valid_fd >= CURRENT_DATE + 30 THEN 1 ELSE 0 END) AS valides,
               SUM(fd.montant) AS montant_total
        FROM frais_divers fd
        JOIN vehicule v ON v.num_veh = fd.num_veh
        WHERE fd.nat_fd IN (1, 2)
        """
    )
    return row or {}


def lookup_taxe_natures() -> list[dict]:
    return [{"value": k, "label": v} for k, v in TAXE_NATURE_LABELS.items()]


# ---- Réformes (vehicle decommissioning) ------------------------------------
# LIGNE_REFORME holds one row per reformed vehicle (linked to a REFORME header
# by NUM_REF). A line is "vendu" once DATE_SORTIE_COMPTES (removal from the
# accounts) is set; otherwise it's decommissioned but not yet sold.
_REFORME_BASE = """
SELECT lr.num_plaque                     AS num_plaque,
       lr.num_ref                        AS reference,
       lr.date_reforme                   AS date_reforme,
       lr.date_sortie_comptes            AS date_vente,
       lr.montant                        AS prix_vente,
       lr.cause_ref                      AS cause,
       v.num_struct                      AS num_struct,
       s.designation                     AS structure,
       concat(lr.num_ref, '|', lr.ref_mat_ref) AS id,
       CASE WHEN lr.date_sortie_comptes IS NOT NULL THEN 'vendu'
            ELSE 'non_vendu' END          AS statut
FROM ligne_reforme lr
LEFT JOIN vehicule v ON v.num_plaque = lr.num_plaque
LEFT JOIN structure s ON s.num_struct = v.num_struct
"""


def list_reformes(
    *,
    search: str | None = None,
    num_struct: str | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}

    if search:
        where.append(
            "(UPPER(lr.num_plaque) LIKE :search OR UPPER(lr.num_ref) LIKE :search "
            "OR UPPER(s.designation) LIKE :search OR UPPER(lr.cause_ref) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_struct:
        where.append("v.num_struct = :num_struct")
        params["num_struct"] = num_struct
    if statut == "vendu":
        where.append("lr.date_sortie_comptes IS NOT NULL")
    elif statut == "non_vendu":
        where.append("lr.date_sortie_comptes IS NULL")

    base = _REFORME_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    return oracle.paginate(
        base, params, page=page, page_size=page_size, order_by="date_reforme DESC"
    )


def reformes_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN date_sortie_comptes IS NOT NULL THEN 1 ELSE 0 END) AS vendus,
               SUM(CASE WHEN date_sortie_comptes IS NULL THEN 1 ELSE 0 END) AS non_vendus,
               COUNT(DISTINCT num_ref) AS nb_references,
               COALESCE(SUM(montant), 0) AS montant_total
        FROM ligne_reforme
        """
    )
    return row or {}


# ---- Bons de travail (work orders / maintenance) ---------------------------
# MODE_REP = nature of the intervention; MOD = internal vs external workshop.
# Values inferred from the data (no lookup table exists).
NATURE_BT_LABELS = {"1": "Réparation", "2": "Remorquage", "3": "Entretien"}
MODE_BT_LABELS = {"1": "Interne", "2": "Externe"}

ETAT_BT_LABELS = {"ouverte": "Ouverte", "cloturee": "Clôturée"}

_BT_BASE = """
SELECT bt.num_bt_int                         AS reference,
       bt.num_veh                            AS num_veh,
       bt.num_plaque                         AS num_plaque,
       bt.num_struct                         AS num_struct,
       s.designation                         AS structure,
       bt.num_parc                           AS num_parc,
       bt.mode_rep                           AS nature_code,
       bt.mod                                AS mode_code,
       bt.date_entree_parc                   AS date_entree,
       btr.date_sortie_prev                  AS date_sortie_prev,
       bt.date_fin                           AS date_sortie,
       bt.num_fourn                          AS num_fourn,
       CASE WHEN bt.date_fin IS NULL THEN 'ouverte' ELSE 'cloturee' END AS etat_code,
       (COALESCE(bt.montant_piece, 0) + COALESCE(bt.montant_main_oeuvre, 0)
        + COALESCE(bt.montant_rep_externe, 0))    AS cout
FROM v_gesparc_bon_travail bt
LEFT JOIN structure s ON s.num_struct = bt.num_struct
LEFT JOIN bon_travail btr ON btr.num_bt_int = bt.num_bt_int
"""


def _decorate_bt(row: dict[str, Any]) -> dict[str, Any]:
    row["nature"] = NATURE_BT_LABELS.get(str(row.get("nature_code")), row.get("nature_code"))
    row["mode"] = MODE_BT_LABELS.get(str(row.get("mode_code")), row.get("mode_code"))
    row["etat"] = ETAT_BT_LABELS.get(str(row.get("etat_code")), row.get("etat_code"))
    return row


def list_bons_travail(
    *,
    search: str | None = None,
    num_struct: str | None = None,
    nature: str | None = None,
    mode: str | None = None,
    etat: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}

    if search:
        where.append(
            "(UPPER(bt.num_bt_int) LIKE :search OR UPPER(bt.num_plaque) LIKE :search "
            "OR UPPER(s.designation) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_struct:
        where.append("bt.num_struct = :num_struct")
        params["num_struct"] = num_struct
    if nature:
        where.append("bt.mode_rep = :nature")
        params["nature"] = nature
    if mode:
        # NB: :mode is an Oracle reserved word — use a safe bind name.
        where.append("bt.mod = :mode_val")
        params["mode_val"] = mode
    if etat == "ouverte":
        where.append("bt.date_fin IS NULL")
    elif etat == "cloturee":
        where.append("bt.date_fin IS NOT NULL")

    base = _BT_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    result = oracle.paginate(
        base, params, page=page, page_size=page_size, order_by="date_entree DESC"
    )
    result["results"] = [_decorate_bt(r) for r in result["results"]]
    return result


def get_bon_travail(reference: str) -> dict[str, Any] | None:
    """Full work-order detail: header + cost breakdown + facturation + operations."""
    header = oracle.fetch_one(
        """
        SELECT bt.num_bt_int              AS reference,
               bt.num_plaque              AS num_plaque,
               bt.num_veh                 AS num_veh,
               bt.num_struct              AS num_struct,
               s.designation              AS structure,
               bt.num_parc                AS num_parc,
               bt.mode_rep                AS nature_code,
               bt.mod                     AS mode_code,
               bt.date_entree_parc        AS date_entree,
               btr.date_sortie_prev       AS date_sortie_prev,
               bt.date_fin                AS date_sortie,
               bt.index_km                AS index_km,
               bt.observation             AS observation,
               mv.designation             AS marque,
               tv.designation             AS type,
               COALESCE(bt.montant_piece, 0)         AS montant_piece,
               COALESCE(bt.montant_main_oeuvre, 0)   AS montant_main_oeuvre,
               COALESCE(bt.montant_rep_externe, 0)   AS montant_rep_externe,
               (COALESCE(bt.montant_piece, 0) + COALESCE(bt.montant_main_oeuvre, 0)
                + COALESCE(bt.montant_rep_externe, 0)) AS cout_total,
               btr.num_bc                 AS num_bc,
               btr.date_bc                AS date_bc,
               btr.num_fourn              AS num_fourn,
               btr.montant_commande       AS montant_commande,
               btr.num_facture            AS num_facture,
               btr.date_facture           AS date_facture,
               btr.montant_reglement      AS montant_reglement,
               btr.num_reglement          AS num_reglement,
               btr.date_reglement         AS date_reglement
        FROM v_gesparc_bon_travail bt
        LEFT JOIN structure s ON s.num_struct = bt.num_struct
        LEFT JOIN bon_travail btr ON btr.num_bt_int = bt.num_bt_int
        LEFT JOIN vehicule v ON v.num_veh = bt.num_veh
        LEFT JOIN marque_vehicule mv ON mv.marque = v.marque
        LEFT JOIN type_vehicule tv ON tv.type = v.type AND tv.marque = v.marque
        WHERE bt.num_bt_int = :ref
        """,
        {"ref": reference},
    )
    if not header:
        return None
    _decorate_bt(header)
    header["operations"] = oracle.fetch_all(
        """
        SELECT o.num_op AS code, o.designation AS designation,
               l.quantite AS quantite, l.prix_unitaire AS prix_unitaire,
               l.nbr_personne AS nbr_personne
        FROM ligne_bon_travail l
        JOIN operation o ON o.num_op = l.num_op
        WHERE l.num_bt_int = :ref
        ORDER BY l.num_lig_bt
        """,
        {"ref": reference},
    )
    return header


def bons_travail_stats() -> dict[str, Any]:
    totals = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN bt.mod = '1' THEN 1 ELSE 0 END) AS internes,
               SUM(CASE WHEN bt.mod = '2' THEN 1 ELSE 0 END) AS externes,
               COALESCE(SUM(COALESCE(bt.montant_piece, 0) + COALESCE(bt.montant_main_oeuvre, 0)
                       + COALESCE(bt.montant_rep_externe, 0)), 0) AS cout_total
        FROM v_gesparc_bon_travail bt
        """
    ) or {}
    by_nature_rows = oracle.fetch_all(
        "SELECT mode_rep AS nature_code, COUNT(*) AS n "
        "FROM v_gesparc_bon_travail GROUP BY mode_rep ORDER BY n DESC"
    )
    for r in by_nature_rows:
        r["nature"] = NATURE_BT_LABELS.get(str(r["nature_code"]), str(r["nature_code"]))
    totals["by_nature"] = by_nature_rows
    return totals


def bons_travail_par_atelier() -> list[dict[str, Any]]:
    """Number of work orders per atelier (from the bt_par_atelier snapshot)."""
    return oracle.fetch_all(
        "SELECT num_atelier, atelier, num_parc, nb_bt "
        "FROM bt_par_atelier ORDER BY nb_bt DESC"
    )


def bons_travail_par_magasin() -> list[dict[str, Any]]:
    """Number of work orders per magasin (from the bt_par_magasin snapshot)."""
    return oracle.fetch_all(
        "SELECT num_mag, magasin, num_parc, nb_bt "
        "FROM bt_par_magasin ORDER BY nb_bt DESC"
    )


# ---- Demandes d'intervention (maintenance requests) ------------------------
DEM_STATUT_LABELS = {"0": "En attente", "1": "Finis", "2": "Refusé"}

_DEM_BASE = """
SELECT d.num_demande                     AS reference,
       d.date_demande                    AS date_demande,
       d.num_plaque                      AS num_plaque,
       d.num_veh                         AS num_veh,
       d.num_struct                      AS num_struct,
       s.designation                     AS structure,
       d.num_parc                        AS num_parc,
       pc.designation                    AS parc,
       v.genre                           AS genre_code,
       gv.designation                    AS genre,
       d.nom_utilisateur                 AS demandeur,
       d.accord                          AS statut_code,
       d.date_rdv_reparation             AS date_rdv,
       d.desc_dem                        AS description,
       d.index_km                        AS index_km,
       concat(d.num_demande, '|', d.num_veh) AS id
FROM dem_intervention d
LEFT JOIN structure s ON s.num_struct = d.num_struct
LEFT JOIN parc pc ON pc.num_parc = d.num_parc
LEFT JOIN vehicule v ON v.num_veh = d.num_veh
LEFT JOIN genre_vehicule gv ON gv.genre = v.genre
"""


def _decorate_dem(row: dict[str, Any]) -> dict[str, Any]:
    row["statut"] = DEM_STATUT_LABELS.get(str(row.get("statut_code")), row.get("statut_code"))
    return row


def list_demandes(
    *,
    search: str | None = None,
    num_struct: str | None = None,
    num_parc: str | None = None,
    genre: str | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}
    if search:
        where.append(
            "(UPPER(d.num_demande) LIKE :search OR UPPER(d.num_plaque) LIKE :search "
            "OR UPPER(s.designation) LIKE :search OR UPPER(d.nom_utilisateur) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_struct:
        where.append("d.num_struct = :num_struct")
        params["num_struct"] = num_struct
    if num_parc:
        where.append("d.num_parc = :num_parc")
        params["num_parc"] = num_parc
    if genre:
        where.append("v.genre = :genre")
        params["genre"] = genre
    if statut:
        where.append("d.accord = :statut")
        params["statut"] = statut

    base = _DEM_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    result = oracle.paginate(
        base, params, page=page, page_size=page_size, order_by="date_demande DESC"
    )
    result["results"] = [_decorate_dem(r) for r in result["results"]]
    return result


def demandes_par_ugp() -> list[dict[str, Any]]:
    """Status breakdown per UGP (parc): one row per parc with a count of
    demandes in each status. Serves 'liste des statuts par UGP'."""
    return oracle.fetch_all(
        """
        SELECT d.num_parc                                          AS num_parc,
               COALESCE(pc.designation, '(non affecté)')           AS parc,
               SUM(CASE WHEN d.accord = '0' THEN 1 ELSE 0 END)     AS en_attente,
               SUM(CASE WHEN d.accord = '1' THEN 1 ELSE 0 END)     AS finis,
               SUM(CASE WHEN d.accord = '2' THEN 1 ELSE 0 END)     AS refuses,
               COUNT(*)                                            AS total
        FROM dem_intervention d
        LEFT JOIN parc pc ON pc.num_parc = d.num_parc
        GROUP BY d.num_parc, pc.designation
        ORDER BY total DESC
        """
    )


def demandes_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN accord = '1' THEN 1 ELSE 0 END) AS finis,
               SUM(CASE WHEN accord = '0' THEN 1 ELSE 0 END) AS en_attente,
               SUM(CASE WHEN accord = '2' THEN 1 ELSE 0 END) AS refuses,
               COUNT(DISTINCT num_veh) AS vehicules
        FROM dem_intervention
        """
    )
    return row or {}


# ---- Achat (bons de commande / supplier orders) ----------------------------
# Header from V_GESPARC_PIECE_FOURNISSEUR (+ fournisseur / parc names), lines
# from V_GESPARC_LIGNE_FOURNISSEUR (+ article designation, computed montants).
BC_STATUT_LABELS = {"receptionne": "Réceptionné(e)", "en_attente": "En attente"}

_BC_BASE = """
SELECT p.num_piece_int                    AS reference,
       p.date_commande                    AS date_creation,
       p.num_fourn                        AS num_fourn,
       f.designation                      AS fournisseur,
       p.num_parc                         AS num_parc,
       pc.designation                     AS parc,
       p.num_marche                       AS num_marche,
       p.montant_commande                 AS montant,
       p.date_livraison                   AS date_livraison,
       p.montant_livre                    AS montant_livre,
       p.montant_facture                  AS montant_facture,
       p.date_facture                     AS date_facture,
       p.montant_reglement                AS montant_reglement,
       p.date_reglement                   AS date_reglement,
       (SELECT COUNT(*) FROM v_gesparc_ligne_fournisseur l
        WHERE l.num_piece_int = p.num_piece_int) AS nb_articles,
       CASE WHEN p.date_livraison IS NOT NULL THEN 'receptionne'
            ELSE 'en_attente' END         AS statut_code
FROM v_gesparc_piece_fournisseur p
LEFT JOIN fournisseur f ON f.num_fourn = p.num_fourn
LEFT JOIN parc pc ON pc.num_parc = p.num_parc
"""


def _decorate_bc(row: dict[str, Any]) -> dict[str, Any]:
    row["statut"] = BC_STATUT_LABELS.get(str(row.get("statut_code")), row.get("statut_code"))
    return row


def list_bons_commande(
    *,
    search: str | None = None,
    num_fourn: str | None = None,
    num_parc: str | None = None,
    article: str | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}
    if search:
        where.append(
            "(UPPER(p.num_piece_int) LIKE :search OR UPPER(f.designation) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_fourn:
        where.append("p.num_fourn = :num_fourn")
        params["num_fourn"] = num_fourn
    if num_parc:
        where.append("p.num_parc = :num_parc")
        params["num_parc"] = num_parc
    if article:
        # Bons de commande containing a given article (→ count per article).
        where.append(
            "EXISTS (SELECT 1 FROM v_gesparc_ligne_fournisseur l "
            "WHERE l.num_piece_int = p.num_piece_int AND l.num_article = :article)"
        )
        params["article"] = article
    if statut == "receptionne":
        where.append("p.date_livraison IS NOT NULL")
    elif statut == "en_attente":
        where.append("p.date_livraison IS NULL")

    base = _BC_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    result = oracle.paginate(
        base, params, page=page, page_size=page_size,
        order_by="date_creation DESC NULLS LAST",
    )
    result["results"] = [_decorate_bc(r) for r in result["results"]]
    return result


def bons_commande_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN date_livraison IS NOT NULL THEN 1 ELSE 0 END) AS receptionnes,
               SUM(CASE WHEN date_livraison IS NULL THEN 1 ELSE 0 END) AS en_attente,
               COUNT(DISTINCT num_fourn) AS nb_fournisseurs,
               COALESCE(SUM(montant_commande), 0) AS montant_total
        FROM v_gesparc_piece_fournisseur
        """
    )
    return row or {}


def get_bon_commande(reference: str) -> dict[str, Any] | None:
    header = oracle.fetch_one(
        _BC_BASE + " WHERE p.num_piece_int = :ref", {"ref": reference}
    )
    if not header:
        return None
    _decorate_bc(header)
    header["lignes"] = oracle.fetch_all(
        """
        SELECT l.num_article       AS code,
               a.designation       AS designation,
               l.qte_commandee     AS quantite,
               l.prix_unitaire     AS prix_unitaire,
               l.tva               AS tva,
               l.montant_net_ht    AS montant_ht,
               l.montant_ttc       AS montant_ttc
        FROM v_gesparc_ligne_fournisseur l
        LEFT JOIN article a ON a.num_article = l.num_article
        WHERE l.num_piece_int = :ref
        ORDER BY l.num_article
        """,
        {"ref": reference},
    )
    return header


def lookup_fournisseurs(search: str | None = None, limit: int = 50) -> list[dict]:
    if search:
        return oracle.fetch_all(
            """
            SELECT num_fourn AS value, designation AS label
            FROM fournisseur
            WHERE UPPER(designation) LIKE :search OR num_fourn LIKE :search
            ORDER BY designation LIMIT :limit
            """,
            {"search": f"%{search.upper()}%", "limit": limit},
        )
    return oracle.fetch_all(
        "SELECT num_fourn AS value, designation AS label "
        "FROM fournisseur ORDER BY designation LIMIT :limit",
        {"limit": limit},
    )


def lookup_parcs() -> list[dict]:
    return oracle.fetch_all(
        "SELECT num_parc AS value, designation AS label "
        "FROM parc ORDER BY num_parc"
    )


def lookup_articles(search: str | None = None, limit: int = 50) -> list[dict]:
    if search:
        return oracle.fetch_all(
            """
            SELECT num_article AS value, designation AS label
            FROM article
            WHERE UPPER(designation) LIKE :search OR UPPER(num_article) LIKE :search
            ORDER BY designation LIMIT :limit
            """,
            {"search": f"%{search.upper()}%", "limit": limit},
        )
    return oracle.fetch_all(
        "SELECT num_article AS value, designation AS label "
        "FROM article ORDER BY designation LIMIT :limit",
        {"limit": limit},
    )


# ---- Stock (articles / parts inventory) ------------------------------------
# Current stock per article comes from the materialized `stock_article`
# snapshot (entrées − sorties, computed in the ETL).
_ARTICLE_LIST_BASE = """
SELECT a.num_article            AS code,
       a.designation            AS designation,
       a.ref_constructeur       AS ref_constructeur,
       a.genre                  AS genre,
       a.marque                 AS marque_code,
       mv.designation           AS marque,
       a.type                   AS type,
       a.prix_unitaire          AS prix,
       COALESCE(s.qte_stock, 0) AS qte_stock
FROM article a
LEFT JOIN stock_article s ON s.num_article = a.num_article
LEFT JOIN marque_vehicule mv ON mv.marque = a.marque
"""


def list_articles(
    *,
    search: str | None = None,
    marque: int | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}
    if search:
        where.append(
            "(UPPER(a.num_article) LIKE :search OR UPPER(a.designation) LIKE :search "
            "OR UPPER(a.ref_constructeur) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if marque is not None:
        where.append("a.marque = :marque")
        params["marque"] = marque
    if statut == "en_stock":
        where.append("COALESCE(s.qte_stock, 0) > 0")
    elif statut == "rupture":
        where.append("COALESCE(s.qte_stock, 0) <= 0")

    base = _ARTICLE_LIST_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    return oracle.paginate(
        base, params, page=page, page_size=page_size, order_by="designation ASC"
    )


def articles_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN COALESCE(s.qte_stock, 0) > 0 THEN 1 ELSE 0 END) AS en_stock,
               SUM(CASE WHEN COALESCE(s.qte_stock, 0) <= 0 THEN 1 ELSE 0 END) AS rupture,
               COALESCE(SUM(GREATEST(COALESCE(s.qte_stock, 0), 0)
                            * COALESCE(a.prix_unitaire, 0)), 0) AS valeur_stock,
               COUNT(DISTINCT a.marque) AS nb_marques
        FROM article a
        LEFT JOIN stock_article s ON s.num_article = a.num_article
        """
    )
    return row or {}


def get_article(code: str) -> dict[str, Any] | None:
    return oracle.fetch_one(
        """
        SELECT a.num_article       AS code,
               a.designation       AS designation,
               a.ref_constructeur  AS ref_constructeur,
               a.ref_remplacement  AS ref_remplacement,
               a.genre             AS genre,
               a.marque            AS marque_code,
               mv.designation      AS marque,
               a.type              AS type,
               a.prix_unitaire     AS prix,
               a.tva               AS tva,
               a.quantite_min      AS quantite_min,
               a.num_famille       AS num_famille,
               f.designation       AS famille,
               a.num_s_famille     AS num_s_famille,
               sf.designation      AS sous_famille,
               COALESCE(s.qte_stock, 0) AS qte_stock
        FROM article a
        LEFT JOIN stock_article s ON s.num_article = a.num_article
        LEFT JOIN marque_vehicule mv ON mv.marque = a.marque
        LEFT JOIN famille f ON f.num_famille = a.num_famille
        LEFT JOIN sous_famille sf
               ON sf.num_famille = a.num_famille AND sf.num_s_famille = a.num_s_famille
        WHERE a.num_article = :code
        """,
        {"code": code},
    )


# ---- Régulation du stock (mouvements de stock) -----------------------------
# One row per article movement line (materialized `mouvement_stock`).
# type_mvt: 1 = entrée, 2 = sortie, 3 = régularisation (inventaire).
MVT_TYPE_LABELS = {1: "Entrée", 2: "Sortie", 3: "Régularisation"}
NAT_BENEF_LABELS = {1: "Magasin", 2: "Fournisseur", 3: "Structure", 4: "Atelier"}

_MVT_BASE = """
SELECT ms.mvt_id            AS id,
       ms.num_piece         AS num_piece,
       ms.date_piece        AS date_piece,
       ms.type_mvt          AS type_code,
       ms.num_article       AS num_article,
       a.designation        AS article,
       ms.quantite          AS quantite,
       ms.prix_unitaire     AS prix_unitaire,
       ROUND(COALESCE(ms.quantite, 0) * COALESCE(ms.prix_unitaire, 0), 3) AS montant,
       ms.num_mag           AS num_mag,
       ms.num_parc          AS num_parc,
       pc.designation       AS parc,
       ms.nat_benef         AS nat_benef_code,
       ms.beneficiaire      AS beneficiaire
FROM mouvement_stock ms
LEFT JOIN article a ON a.num_article = ms.num_article
LEFT JOIN parc pc ON pc.num_parc = ms.num_parc
"""


def _decorate_mvt(row: dict[str, Any]) -> dict[str, Any]:
    tc = row.get("type_code")
    row["type"] = MVT_TYPE_LABELS.get(int(tc), tc) if tc is not None else None
    nb = row.get("nat_benef_code")
    row["nat_benef"] = NAT_BENEF_LABELS.get(int(nb), nb) if nb is not None else None
    return row


def list_mouvements_stock(
    *,
    search: str | None = None,
    type_mvt: int | None = None,
    article: str | None = None,
    num_parc: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}
    if search:
        where.append(
            "(UPPER(ms.num_article) LIKE :search OR UPPER(a.designation) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if type_mvt is not None:
        where.append("ms.type_mvt = :type_mvt")
        params["type_mvt"] = type_mvt
    if article:
        where.append("ms.num_article = :article")
        params["article"] = article
    if num_parc:
        where.append("ms.num_parc = :num_parc")
        params["num_parc"] = num_parc

    base = _MVT_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    result = oracle.paginate(
        base, params, page=page, page_size=page_size,
        order_by="date_piece DESC NULLS LAST, num_piece, num_article",
    )
    result["results"] = [_decorate_mvt(r) for r in result["results"]]
    return result


def mouvements_stock_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN type_mvt = 1 THEN 1 ELSE 0 END) AS entrees,
               SUM(CASE WHEN type_mvt = 2 THEN 1 ELSE 0 END) AS sorties,
               SUM(CASE WHEN type_mvt = 3 THEN 1 ELSE 0 END) AS regularisations,
               COUNT(DISTINCT num_article) AS nb_articles,
               COUNT(DISTINCT num_piece) AS nb_pieces
        FROM mouvement_stock
        """
    )
    return row or {}


def lookup_mvt_types() -> list[dict]:
    return [{"value": k, "label": v} for k, v in MVT_TYPE_LABELS.items()]


def lookup_magasins() -> list[dict]:
    return oracle.fetch_all(
        "SELECT DISTINCT num_mag AS value, COALESCE(magasin, num_mag) AS label "
        "FROM mouvement_stock WHERE num_mag IS NOT NULL ORDER BY 2"
    )


# ---- Bons de sortie (parts issued for a work order) ------------------------
# A "bon de sortie" is a stock-exit document (PIECE_ARTICLE type=2) issued to
# fulfil a bon de travail. Header-level view over mouvement_stock, grouped by
# the piece; the work order supplies mode (interne/externe), the vehicle
# (série) and whether it is closed.
BS_MODE_LABELS = {"1": "Interne", "2": "Externe"}
BS_STATUT_LABELS = {"1": "Clôturé", "0": "Non clôturé"}

_BON_SORTIE_SELECT = """
SELECT ms.num_piece                        AS num_piece,
       MAX(ms.date_piece)                  AS date_piece,
       MAX(ms.num_mag)                     AS num_mag,
       MAX(ms.magasin)                     AS magasin,
       MAX(ms.num_parc)                    AS num_parc,
       MAX(pc.designation)                 AS parc,
       MAX(ms.bt_mode)                     AS mode_code,
       MAX(ms.num_bt_int)                  AS num_bt_int,
       MAX(ms.bt_num_veh)                  AS num_veh,
       MAX(ms.bt_cloture)                  AS cloture_code,
       MAX(ms.beneficiaire)                AS atelier,
       COUNT(*)                            AS nb_articles,
       ROUND(SUM(COALESCE(ms.quantite, 0) * COALESCE(ms.prix_unitaire, 0)), 3) AS montant
FROM mouvement_stock ms
LEFT JOIN parc pc ON pc.num_parc = ms.num_parc
"""


def _decorate_bs(row: dict[str, Any]) -> dict[str, Any]:
    row["mode"] = BS_MODE_LABELS.get(str(row.get("mode_code")), row.get("mode_code"))
    cc = row.get("cloture_code")
    row["statut"] = BS_STATUT_LABELS.get(str(int(cc)), None) if cc is not None else None
    return row


def _bs_where(search, mode, num_mag, num_parc, article, num_veh, statut, params):
    where = ["ms.type_mvt = 2", "ms.num_bt_int IS NOT NULL"]
    if search:
        where.append(
            "(UPPER(ms.num_piece) LIKE :search OR UPPER(ms.num_bt_int) LIKE :search "
            "OR UPPER(ms.bt_num_veh) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if mode:
        where.append("ms.bt_mode = :mode_val")
        params["mode_val"] = mode
    if num_mag:
        where.append("ms.num_mag = :num_mag")
        params["num_mag"] = num_mag
    if num_parc:
        where.append("ms.num_parc = :num_parc")
        params["num_parc"] = num_parc
    if num_veh:
        where.append("ms.bt_num_veh = :num_veh")
        params["num_veh"] = num_veh
    if statut in ("0", "1"):
        where.append("ms.bt_cloture = :cloture")
        params["cloture"] = int(statut)
    if article:
        where.append(
            "ms.num_piece IN (SELECT num_piece FROM mouvement_stock "
            "WHERE type_mvt = 2 AND num_article = :article)"
        )
        params["article"] = article
    return where


def list_bons_sortie(
    *,
    search: str | None = None,
    mode: str | None = None,
    num_mag: str | None = None,
    num_parc: str | None = None,
    article: str | None = None,
    num_veh: str | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    params: dict[str, Any] = {}
    where = _bs_where(search, mode, num_mag, num_parc, article, num_veh, statut, params)
    base = _BON_SORTIE_SELECT + " WHERE " + " AND ".join(where) + " GROUP BY ms.num_piece"
    result = oracle.paginate(
        base, params, page=page, page_size=page_size,
        order_by="date_piece DESC NULLS LAST, num_piece",
    )
    result["results"] = [_decorate_bs(r) for r in result["results"]]
    return result


def bons_sortie_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(DISTINCT num_piece)  AS total,
               COUNT(*)                   AS nb_lignes,
               COUNT(DISTINCT num_article) AS nb_articles,
               COUNT(DISTINCT num_bt_int) AS nb_bt,
               COALESCE(SUM(COALESCE(quantite, 0) * COALESCE(prix_unitaire, 0)), 0) AS montant_total
        FROM mouvement_stock
        WHERE type_mvt = 2 AND num_bt_int IS NOT NULL
        """
    )
    return row or {}


def _bs_breakdown(group_expr: str, label_map: dict | None = None) -> list[dict]:
    rows = oracle.fetch_all(
        f"""
        SELECT {group_expr} AS key, COUNT(DISTINCT num_piece) AS nb
        FROM mouvement_stock ms
        WHERE type_mvt = 2 AND num_bt_int IS NOT NULL
        GROUP BY {group_expr}
        ORDER BY nb DESC
        """
    )
    if label_map:
        for r in rows:
            r["label"] = label_map.get(str(r["key"]), r["key"])
    return rows


def bons_sortie_breakdown() -> dict[str, Any]:
    par_mode = _bs_breakdown("ms.bt_mode", BS_MODE_LABELS)
    par_statut = [
        {**r, "label": BS_STATUT_LABELS.get(str(int(r["key"])) if r["key"] is not None else "", r["key"])}
        for r in _bs_breakdown("ms.bt_cloture")
    ]
    par_magasin = oracle.fetch_all(
        """
        SELECT COALESCE(magasin, num_mag) AS label, COUNT(DISTINCT num_piece) AS nb
        FROM mouvement_stock WHERE type_mvt = 2 AND num_bt_int IS NOT NULL
        GROUP BY COALESCE(magasin, num_mag) ORDER BY nb DESC
        """
    )
    par_ugp = oracle.fetch_all(
        """
        SELECT COALESCE(pc.designation, ms.num_parc, '(non affecté)') AS label,
               COUNT(DISTINCT ms.num_piece) AS nb
        FROM mouvement_stock ms LEFT JOIN parc pc ON pc.num_parc = ms.num_parc
        WHERE ms.type_mvt = 2 AND ms.num_bt_int IS NOT NULL
        GROUP BY COALESCE(pc.designation, ms.num_parc, '(non affecté)') ORDER BY nb DESC
        """
    )
    return {"mode": par_mode, "statut": par_statut, "magasin": par_magasin, "ugp": par_ugp}


# ---- Réceptions de fournisseur (goods received into stock) -----------------
# A "réception" is a stock-entry document (PIECE_ARTICLE type=1) whose
# beneficiary is a supplier (nat_benef=2). Header-level view over
# mouvement_stock. "Statut" = whether it is tied to a purchase order (ref_bc).
RECEP_STATUT_LABELS = {"1": "Sur commande", "0": "Directe"}

_RECEPTION_SELECT = """
SELECT ms.num_piece                        AS num_piece,
       MAX(ms.date_piece)                  AS date_piece,
       MAX(ms.num_mag)                     AS num_mag,
       MAX(ms.magasin)                     AS magasin,
       MAX(ms.num_parc)                    AS num_parc,
       MAX(pc.designation)                 AS parc,
       MAX(ms.num_benef)                   AS num_fourn,
       MAX(ms.beneficiaire)                AS fournisseur,
       MAX(ms.ref_bc)                      AS ref_bc,
       MAX(CASE WHEN ms.ref_bc IS NOT NULL THEN 1 ELSE 0 END) AS statut_code,
       COUNT(*)                            AS nb_articles,
       ROUND(SUM(COALESCE(ms.quantite, 0) * COALESCE(ms.prix_unitaire, 0)), 3) AS montant
FROM mouvement_stock ms
LEFT JOIN parc pc ON pc.num_parc = ms.num_parc
"""


def _decorate_recep(row: dict[str, Any]) -> dict[str, Any]:
    sc = row.get("statut_code")
    row["statut"] = RECEP_STATUT_LABELS.get(str(int(sc)), None) if sc is not None else None
    return row


def _recep_where(search, num_fourn, num_parc, article, statut, params):
    where = ["ms.type_mvt = 1", "ms.nat_benef = 2"]
    if search:
        where.append(
            "(UPPER(ms.num_piece) LIKE :search OR UPPER(ms.beneficiaire) LIKE :search "
            "OR UPPER(ms.ref_bc) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_fourn:
        where.append("ms.num_benef = :num_fourn")
        params["num_fourn"] = num_fourn
    if num_parc:
        where.append("ms.num_parc = :num_parc")
        params["num_parc"] = num_parc
    if statut == "1":
        where.append("ms.ref_bc IS NOT NULL")
    elif statut == "0":
        where.append("ms.ref_bc IS NULL")
    if article:
        where.append(
            "ms.num_piece IN (SELECT num_piece FROM mouvement_stock "
            "WHERE type_mvt = 1 AND num_article = :article)"
        )
        params["article"] = article
    return where


def list_receptions(
    *,
    search: str | None = None,
    num_fourn: str | None = None,
    num_parc: str | None = None,
    article: str | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    params: dict[str, Any] = {}
    where = _recep_where(search, num_fourn, num_parc, article, statut, params)
    base = _RECEPTION_SELECT + " WHERE " + " AND ".join(where) + " GROUP BY ms.num_piece"
    result = oracle.paginate(
        base, params, page=page, page_size=page_size,
        order_by="date_piece DESC NULLS LAST, num_piece",
    )
    result["results"] = [_decorate_recep(r) for r in result["results"]]
    return result


def receptions_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(DISTINCT num_piece)   AS total,
               COUNT(*)                    AS nb_lignes,
               COUNT(DISTINCT num_article) AS nb_articles,
               COUNT(DISTINCT num_benef)   AS nb_fournisseurs,
               COALESCE(SUM(COALESCE(quantite, 0) * COALESCE(prix_unitaire, 0)), 0) AS montant_total
        FROM mouvement_stock
        WHERE type_mvt = 1 AND nat_benef = 2
        """
    )
    return row or {}


def receptions_breakdown() -> dict[str, Any]:
    par_statut = oracle.fetch_all(
        """
        SELECT CASE WHEN ref_bc IS NOT NULL THEN 'Sur commande' ELSE 'Directe' END AS label,
               COUNT(DISTINCT num_piece) AS nb
        FROM mouvement_stock WHERE type_mvt = 1 AND nat_benef = 2
        GROUP BY CASE WHEN ref_bc IS NOT NULL THEN 'Sur commande' ELSE 'Directe' END
        ORDER BY nb DESC
        """
    )
    par_parc = oracle.fetch_all(
        """
        SELECT COALESCE(pc.designation, ms.num_parc, '(non affecté)') AS label,
               COUNT(DISTINCT ms.num_piece) AS nb
        FROM mouvement_stock ms LEFT JOIN parc pc ON pc.num_parc = ms.num_parc
        WHERE ms.type_mvt = 1 AND ms.nat_benef = 2
        GROUP BY COALESCE(pc.designation, ms.num_parc, '(non affecté)') ORDER BY nb DESC
        """
    )
    par_fournisseur = oracle.fetch_all(
        """
        SELECT COALESCE(beneficiaire, num_benef) AS label, COUNT(DISTINCT num_piece) AS nb
        FROM mouvement_stock WHERE type_mvt = 1 AND nat_benef = 2
        GROUP BY COALESCE(beneficiaire, num_benef) ORDER BY nb DESC LIMIT 15
        """
    )
    return {"statut": par_statut, "parc": par_parc, "fournisseur": par_fournisseur}


# ---- Ordres de mission -----------------------------------------------------
OM_STATUT_LABELS = {"en_cours": "En cours", "terminee": "Terminée"}

_OM_BASE = """
SELECT om.num_om                          AS num_om,
       om.num_plaque                      AS num_plaque,
       om.num_veh                         AS num_veh,
       om.num_struct                      AS num_struct,
       s.designation                      AS structure,
       om.iu                              AS iu,
       NULLIF(TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')), '') AS conducteur,
       om.destination                     AS destination,
       om.date_om                         AS date_om,
       om.date_depart                     AS date_depart,
       om.date_fin                        AS date_fin,
       om.date_debut_validite             AS date_debut_validite,
       om.date_fin_validite               AS date_fin_validite,
       om.km_depart                       AS km_depart,
       om.km_retour                       AS km_retour,
       CASE WHEN om.date_fin IS NOT NULL THEN 'terminee' ELSE 'en_cours' END AS statut_code
FROM ordre_mission om
LEFT JOIN structure s ON s.num_struct = om.num_struct
LEFT JOIN personnel p ON p.iu = om.iu
"""


def _decorate_om(row: dict[str, Any]) -> dict[str, Any]:
    row["statut"] = OM_STATUT_LABELS.get(str(row.get("statut_code")), row.get("statut_code"))
    return row


def list_ordres_mission(
    *,
    search: str | None = None,
    num_struct: str | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}
    if search:
        where.append(
            "(om.num_om::text LIKE :search OR UPPER(om.num_plaque) LIKE :search "
            "OR UPPER(om.destination) LIKE :search OR UPPER(s.designation) LIKE :search "
            "OR UPPER(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_struct:
        where.append("om.num_struct = :num_struct")
        params["num_struct"] = num_struct
    if statut == "en_cours":
        where.append("om.date_fin IS NULL")
    elif statut == "terminee":
        where.append("om.date_fin IS NOT NULL")

    base = _OM_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    result = oracle.paginate(
        base, params, page=page, page_size=page_size,
        order_by="date_depart DESC NULLS LAST, num_om DESC",
    )
    result["results"] = [_decorate_om(r) for r in result["results"]]
    return result


def ordres_mission_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN date_fin IS NULL THEN 1 ELSE 0 END) AS en_cours,
               SUM(CASE WHEN date_fin IS NOT NULL THEN 1 ELSE 0 END) AS terminees,
               COUNT(DISTINCT num_veh) AS vehicules,
               COUNT(DISTINCT iu) AS conducteurs
        FROM ordre_mission
        """
    )
    return row or {}


def get_ordre_mission(num_om: int) -> dict[str, Any] | None:
    row = oracle.fetch_one(
        _OM_BASE.rstrip() + " WHERE om.num_om = :num_om", {"num_om": num_om}
    )
    if not row:
        return None
    _decorate_om(row)
    extra = oracle.fetch_one(
        "SELECT objectif, produits_transp, lieu_depart, "
        "(km_retour - km_depart) AS distance FROM ordre_mission WHERE num_om = :num_om",
        {"num_om": num_om},
    )
    if extra:
        row.update(extra)
    return row


# ---- Fournisseurs (référentiel) --------------------------------------------
FOURN_STATUT_LABELS = {"actif": "Actif", "bloque": "Bloqué"}

_FOURN_LIST_BASE = """
SELECT num_fourn            AS code,
       designation          AS designation,
       activite             AS activite,
       adresse              AS adresse,
       tel                  AS tel,
       email                AS email,
       COALESCE(bloque, 0)  AS bloque
FROM fournisseur
"""


def _decorate_fourn(row: dict[str, Any]) -> dict[str, Any]:
    row["statut"] = "Bloqué" if int(row.get("bloque") or 0) != 0 else "Actif"
    return row


def list_fournisseurs(
    *,
    search: str | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}
    if search:
        where.append(
            "(UPPER(designation) LIKE :search OR num_fourn LIKE :search "
            "OR UPPER(COALESCE(adresse, '')) LIKE :search "
            "OR UPPER(COALESCE(activite, '')) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if statut == "actif":
        where.append("COALESCE(bloque, 0) = 0")
    elif statut == "bloque":
        where.append("COALESCE(bloque, 0) <> 0")

    base = _FOURN_LIST_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    result = oracle.paginate(
        base, params, page=page, page_size=page_size, order_by="designation ASC"
    )
    result["results"] = [_decorate_fourn(r) for r in result["results"]]
    return result


def fournisseurs_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN COALESCE(bloque, 0) = 0 THEN 1 ELSE 0 END) AS actifs,
               SUM(CASE WHEN COALESCE(bloque, 0) <> 0 THEN 1 ELSE 0 END) AS bloques,
               SUM(CASE WHEN tel IS NOT NULL AND TRIM(tel) <> '' THEN 1 ELSE 0 END) AS avec_tel
        FROM fournisseur
        """
    )
    return row or {}


def get_fournisseur(code: str) -> dict[str, Any] | None:
    row = oracle.fetch_one(
        """
        SELECT num_fourn       AS code,
               designation     AS designation,
               raison_sociale  AS raison_sociale,
               activite        AS activite,
               adresse         AS adresse,
               tel             AS tel,
               fax             AS fax,
               email           AS email,
               web             AS web,
               bank            AS bank,
               rib             AS rib,
               mat_fisc        AS mat_fisc,
               date_creation   AS date_creation,
               COALESCE(bloque, 0) AS bloque
        FROM fournisseur
        WHERE num_fourn = :code
        """,
        {"code": code},
    )
    return _decorate_fourn(row) if row else None


# ---- Sinistres / assurances ------------------------------------------------
SIN_NATURE_LABELS = {1: "Accident", 2: "Vol", 3: "Incendie", 4: "Autre"}
SIN_STATUT_LABELS = {"ouvert": "Ouvert", "clos": "Clôturé"}

_SIN_BASE = """
SELECT s.num_sin                          AS num_sin,
       s.num_plaque                       AS num_plaque,
       s.num_veh                          AS num_veh,
       v.num_struct                       AS num_struct,
       st.designation                     AS structure,
       s.num_cause_sin                    AS cause_code,
       c.designation                      AS cause,
       s.nature_sinistre                  AS nature_code,
       s.date_sinistre                    AS date_sinistre,
       s.lieu_sinistre                    AS lieu_sinistre,
       s.tiers                            AS tiers,
       s.montant_rep                      AS montant_rep,
       s.montant_indem                    AS montant_indem,
       s.date_fin                         AS date_fin,
       CASE WHEN s.date_fin IS NULL THEN 'ouvert' ELSE 'clos' END AS statut_code
FROM sinistre s
LEFT JOIN cause_sin c ON c.num_cause_sin::numeric = s.num_cause_sin
LEFT JOIN vehicule v ON v.num_veh = s.num_veh
LEFT JOIN structure st ON st.num_struct = v.num_struct
"""


def _decorate_sin(row: dict[str, Any]) -> dict[str, Any]:
    nc = row.get("nature_code")
    row["nature"] = SIN_NATURE_LABELS.get(int(nc)) if nc is not None else None
    row["statut"] = SIN_STATUT_LABELS.get(str(row.get("statut_code")), row.get("statut_code"))
    return row


def list_sinistres(
    *,
    search: str | None = None,
    nature: int | None = None,
    statut: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}
    if search:
        where.append(
            "(UPPER(s.num_sin) LIKE :search OR UPPER(s.num_plaque) LIKE :search "
            "OR UPPER(COALESCE(c.designation, '')) LIKE :search "
            "OR UPPER(COALESCE(st.designation, '')) LIKE :search "
            "OR UPPER(COALESCE(s.tiers, '')) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if nature is not None:
        where.append("s.nature_sinistre = :nature")
        params["nature"] = nature
    if statut == "ouvert":
        where.append("s.date_fin IS NULL")
    elif statut == "clos":
        where.append("s.date_fin IS NOT NULL")

    base = _SIN_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    result = oracle.paginate(
        base, params, page=page, page_size=page_size,
        order_by="date_sinistre DESC NULLS LAST",
    )
    result["results"] = [_decorate_sin(r) for r in result["results"]]
    return result


def sinistres_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN date_fin IS NULL THEN 1 ELSE 0 END) AS ouverts,
               SUM(CASE WHEN date_fin IS NOT NULL THEN 1 ELSE 0 END) AS clos,
               COALESCE(SUM(montant_rep), 0) AS montant_rep_total,
               COALESCE(SUM(montant_indem), 0) AS montant_indem_total
        FROM sinistre
        """
    )
    return row or {}


def get_sinistre(num_sin: str) -> dict[str, Any] | None:
    row = oracle.fetch_one(
        """
        SELECT s.num_sin           AS num_sin,
               s.num_plaque        AS num_plaque,
               s.num_veh           AS num_veh,
               v.num_struct        AS num_struct,
               st.designation      AS structure,
               s.num_cause_sin     AS cause_code,
               c.designation       AS cause,
               s.nature_sinistre   AS nature_code,
               s.date_sinistre     AS date_sinistre,
               s.lieu_sinistre     AS lieu_sinistre,
               s.observation       AS observation,
               s.tiers             AS tiers,
               s.adresse_tiers     AS adresse_tiers,
               s.assurance_tiers   AS assurance_tiers,
               s.num_expert        AS expert_code,
               e.designation       AS expert,
               s.date_expertise    AS date_expertise,
               s.date_reexpertise  AS date_reexpertise,
               s.date_notif        AS date_notif,
               s.montant_rep       AS montant_rep,
               s.montant_indem     AS montant_indem,
               s.date_fin          AS date_fin,
               CASE WHEN s.date_fin IS NULL THEN 'ouvert' ELSE 'clos' END AS statut_code
        FROM sinistre s
        LEFT JOIN cause_sin c ON c.num_cause_sin::numeric = s.num_cause_sin
        LEFT JOIN vehicule v ON v.num_veh = s.num_veh
        LEFT JOIN structure st ON st.num_struct = v.num_struct
        LEFT JOIN expert e ON e.num_expert = s.num_expert
        WHERE s.num_sin = :num_sin
        """,
        {"num_sin": num_sin},
    )
    return _decorate_sin(row) if row else None


# ---- Exploitation (monthly usage / fuel per vehicle) -----------------------
# From the materialized V_GESPARC_EXPLOITATION (computed km parcourus, fuel
# consumed, consommation moyenne /100km). One row per vehicle × month × year.
_EXPL_BASE = """
SELECT e.annee                 AS annee,
       e.mois                  AS mois,
       e.num_plaque            AS num_plaque,
       e.num_veh               AS num_veh,
       e.num_struct            AS num_struct,
       s.designation           AS structure,
       e.energie               AS energie_code,
       et.designation          AS energie,
       e.index_km_n            AS index_km,
       e.index_km_n_1          AS index_km_prec,
       e.km_parc_n             AS km_parcourus,
       e.qt_recue_n            AS carburant_recu,
       e.qt_carb_cons_n        AS carburant_consomme,
       e.qt_carb_rest_n        AS carburant_restant,
       e.qt_carb_ret_n         AS carburant_retourne,
       -- the view's cmck_n is unreliable; compute conso / 100 km ourselves.
       CASE WHEN e.km_parc_n > 0
            THEN ROUND(e.qt_carb_cons_n::numeric / e.km_parc_n * 100, 2)
            ELSE NULL END      AS cmck,
       -- Marque "GE" = Groupe Électrogène (stationary generator, no odometer).
       CASE WHEN TRIM(mv.designation) = 'GE' THEN 'groupe_electrogene'
            ELSE 'vehicule' END AS categorie,
       concat(e.num_veh, '_', e.annee, '_', e.mois) AS id
FROM v_gesparc_exploitation e
LEFT JOIN structure s ON s.num_struct = e.num_struct
LEFT JOIN energie_tab et ON et.energie = e.energie::text
LEFT JOIN vehicule veh ON veh.num_veh = e.num_veh
LEFT JOIN marque_vehicule mv ON mv.marque = veh.marque
"""


def list_exploitation(
    *,
    search: str | None = None,
    annee: int | None = None,
    mois: int | None = None,
    num_struct: str | None = None,
    categorie: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}
    if search:
        where.append("UPPER(e.num_plaque) LIKE :search")
        params["search"] = f"%{search.upper()}%"
    if annee is not None:
        where.append("e.annee = :annee")
        params["annee"] = annee
    if mois is not None:
        where.append("e.mois = :mois")
        params["mois"] = mois
    if num_struct:
        where.append("e.num_struct = :num_struct")
        params["num_struct"] = num_struct
    if categorie == "groupe_electrogene":
        where.append("TRIM(mv.designation) = 'GE'")
    elif categorie == "vehicule":
        where.append("COALESCE(TRIM(mv.designation), '') <> 'GE'")

    base = _EXPL_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    return oracle.paginate(
        base, params, page=page, page_size=page_size,
        order_by="annee DESC, mois DESC, num_plaque",
    )


def exploitation_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               COALESCE(SUM(GREATEST(km_parc_n, 0)), 0) AS km_total,
               COALESCE(SUM(GREATEST(qt_carb_cons_n, 0)), 0) AS carburant_total,
               COUNT(DISTINCT num_veh) AS vehicules,
               COUNT(DISTINCT annee) AS annees
        FROM v_gesparc_exploitation
        """
    )
    return row or {}


def exploitation_annees() -> list[dict]:
    return oracle.fetch_all(
        "SELECT DISTINCT annee AS value, annee AS label "
        "FROM v_gesparc_exploitation WHERE annee IS NOT NULL ORDER BY annee DESC"
    )


# ---- Carburant (fuel-distribution log) -------------------------------------
# type_ligne_carb: 1 = normal distribution, 2 = complément/régularisation.
CARB_TYPE_LABELS = {1: "Distribution", 2: "Complément"}

_CARB_BASE = """
SELECT c.num_ligne_carb        AS num_ligne_carb,
       c.date_piece            AS date_piece,
       c.num_plaque            AS num_plaque,
       c.num_veh               AS num_veh,
       c.num_struct            AS num_struct,
       s.designation           AS structure,
       c.iu                    AS iu,
       NULLIF(TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')), '') AS beneficiaire,
       c.energie               AS energie_code,
       et.designation          AS energie,
       c.quantite              AS quantite,
       c.prix_unitaire         AS prix_unitaire,
       ROUND(COALESCE(c.quantite, 0) * COALESCE(c.prix_unitaire, 0), 3) AS montant,
       c.index_km              AS index_km,
       c.type_ligne_carb       AS type_code,
       c.ref_bc                AS ref_bc,
       -- Marque "GE" = Groupe Électrogène (stationary generator).
       CASE WHEN TRIM(mv.designation) = 'GE' THEN 'groupe_electrogene'
            ELSE 'vehicule' END AS categorie,
       c.num_ligne_carb        AS id
FROM ligne_carburant c
LEFT JOIN structure s ON s.num_struct = c.num_struct
LEFT JOIN energie_tab et ON et.energie = c.energie::text
LEFT JOIN personnel p ON p.iu = c.iu
LEFT JOIN vehicule veh ON veh.num_veh = c.num_veh
LEFT JOIN marque_vehicule mv ON mv.marque = veh.marque
"""


def _decorate_carb(row: dict[str, Any]) -> dict[str, Any]:
    code = row.get("type_code")
    row["type"] = CARB_TYPE_LABELS.get(int(code), code) if code is not None else None
    return row


def list_carburant(
    *,
    search: str | None = None,
    num_struct: str | None = None,
    energie: str | None = None,
    annee: int | None = None,
    categorie: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    where: list[str] = []
    params: dict[str, Any] = {}
    if search:
        where.append(
            "(UPPER(c.num_plaque) LIKE :search OR UPPER(p.prenom) LIKE :search "
            "OR UPPER(p.nom) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_struct:
        where.append("c.num_struct = :num_struct")
        params["num_struct"] = num_struct
    if energie:
        where.append("c.energie::text = :energie")
        params["energie"] = energie
    if annee is not None:
        where.append("EXTRACT(YEAR FROM c.date_piece) = :annee")
        params["annee"] = annee
    if categorie == "groupe_electrogene":
        where.append("TRIM(mv.designation) = 'GE'")
    elif categorie == "vehicule":
        where.append("COALESCE(TRIM(mv.designation), '') <> 'GE'")

    base = _CARB_BASE
    if where:
        base += " WHERE " + " AND ".join(where)
    result = oracle.paginate(
        base, params, page=page, page_size=page_size,
        order_by="date_piece DESC NULLS LAST, num_ligne_carb",
    )
    result["results"] = [_decorate_carb(r) for r in result["results"]]
    return result


def carburant_stats() -> dict[str, Any]:
    row = oracle.fetch_one(
        """
        SELECT COUNT(*) AS total,
               COALESCE(SUM(GREATEST(quantite, 0)), 0) AS litres_total,
               COALESCE(SUM(GREATEST(quantite, 0) * COALESCE(prix_unitaire, 0)), 0)
                   AS montant_total,
               COUNT(DISTINCT num_veh) AS vehicules,
               COUNT(DISTINCT EXTRACT(YEAR FROM date_piece)) AS annees
        FROM ligne_carburant
        """
    )
    return row or {}


def carburant_annees() -> list[dict]:
    return oracle.fetch_all(
        "SELECT DISTINCT EXTRACT(YEAR FROM date_piece)::int AS value, "
        "EXTRACT(YEAR FROM date_piece)::int AS label "
        "FROM ligne_carburant WHERE date_piece IS NOT NULL ORDER BY 1 DESC"
    )


# ---- Overview (home dashboard aggregates) ----------------------------------

def overview() -> dict[str, Any]:
    """Consolidated cross-module aggregates for the home dashboard."""
    v = vehicle_stats()
    bt = bons_travail_stats()
    rf = reformes_stats()
    vt = visites_techniques_stats()

    # Complete-year window only: recent partial years would show a misleading dip.
    cout_par_annee = oracle.fetch_all(
        """
        SELECT TO_CHAR(date_entree_parc, 'YYYY') AS annee,
               COALESCE(SUM(COALESCE(montant_piece, 0) + COALESCE(montant_main_oeuvre, 0)
                       + COALESCE(montant_rep_externe, 0)), 0) AS cout,
               COUNT(*) AS nombre
        FROM v_gesparc_bon_travail
        WHERE date_entree_parc IS NOT NULL
          AND EXTRACT(YEAR FROM date_entree_parc) BETWEEN 2016 AND 2025
        GROUP BY TO_CHAR(date_entree_parc, 'YYYY')
        ORDER BY annee
        """
    )

    # Where the maintenance money goes (parts / labour / external repair).
    cout_composition = oracle.fetch_one(
        """
        SELECT COALESCE(SUM(montant_piece), 0)        AS pieces,
               COALESCE(SUM(montant_main_oeuvre), 0)  AS main_oeuvre,
               COALESCE(SUM(montant_rep_externe), 0)  AS externe
        FROM v_gesparc_bon_travail
        """
    ) or {}

    parc_par_genre = oracle.fetch_all(
        """
        SELECT gv.designation AS genre, COUNT(*) AS n
        FROM vehicule v
        LEFT JOIN genre_vehicule gv ON gv.genre = v.genre
        WHERE gv.designation IS NOT NULL
        GROUP BY gv.designation
        ORDER BY n DESC
        FETCH FIRST 8 ROWS ONLY
        """
    )

    top_structures = oracle.fetch_all(
        """
        SELECT s.designation AS structure, COUNT(*) AS n
        FROM vehicule v
        LEFT JOIN structure s ON s.num_struct = v.num_struct
        WHERE s.designation IS NOT NULL
        GROUP BY s.designation
        ORDER BY n DESC
        FETCH FIRST 8 ROWS ONLY
        """
    )

    age_moyen = oracle.fetch_scalar(
        "SELECT ROUND(AVG(age_veh), 1) FROM v_gesparc_vehicule WHERE age_veh IS NOT NULL"
    )
    taxes_expirees = oracle.fetch_scalar(
        "SELECT COUNT(*) FROM frais_divers WHERE nat_fd IN (1, 2) "
        "AND date_valid_fd < CURRENT_DATE"
    )

    en_circulation = next(
        (e["n"] for e in v["by_etat"] if e.get("etat_code") == 1), 0
    )
    total = v["total"] or 0
    cout_total = bt["cout_total"] or 0

    return {
        "kpis": {
            "vehicules_total": total,
            "en_circulation": en_circulation,
            "disponibilite": round(en_circulation / total * 100, 1) if total else 0,
            "age_moyen": age_moyen,
            "bons_travail_total": bt["total"],
            "cout_maintenance_total": cout_total,
            "cout_moyen_vehicule": round(cout_total / total) if total else 0,
            "reformes_total": rf["total"],
            "reformes_vendus": rf["vendus"],
            "visites_total": vt["total"],
            "visites_expirees": vt["expirees"],
            "taxes_expirees": taxes_expirees or 0,
        },
        "parc_par_etat": v["by_etat"],
        "parc_par_energie": v["by_energie"],
        "parc_par_genre": parc_par_genre,
        "top_marques": v["by_marque"],
        "top_structures": top_structures,
        "bt_par_nature": bt["by_nature"],
        "cout_composition": cout_composition,
        "cout_maintenance_par_annee": cout_par_annee,
    }
