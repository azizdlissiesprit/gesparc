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
       v.age_veh              AS age_veh
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


# ---- Demandes d'intervention (maintenance requests) ------------------------
DEM_STATUT_LABELS = {"0": "En attente", "1": "Finis", "2": "Refusé"}

_DEM_BASE = """
SELECT d.num_demande                     AS reference,
       d.date_demande                    AS date_demande,
       d.num_plaque                      AS num_plaque,
       d.num_veh                         AS num_veh,
       d.num_struct                      AS num_struct,
       s.designation                     AS structure,
       d.nom_utilisateur                 AS demandeur,
       d.accord                          AS statut_code,
       d.date_rdv_reparation             AS date_rdv,
       d.desc_dem                        AS description,
       d.index_km                        AS index_km,
       concat(d.num_demande, '|', d.num_veh) AS id
FROM dem_intervention d
LEFT JOIN structure s ON s.num_struct = d.num_struct
"""


def _decorate_dem(row: dict[str, Any]) -> dict[str, Any]:
    row["statut"] = DEM_STATUT_LABELS.get(str(row.get("statut_code")), row.get("statut_code"))
    return row


def list_demandes(
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
            "(UPPER(d.num_demande) LIKE :search OR UPPER(d.num_plaque) LIKE :search "
            "OR UPPER(s.designation) LIKE :search OR UPPER(d.nom_utilisateur) LIKE :search)"
        )
        params["search"] = f"%{search.upper()}%"
    if num_struct:
        where.append("d.num_struct = :num_struct")
        params["num_struct"] = num_struct
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


# ---- Overview (home dashboard aggregates) ----------------------------------

def overview() -> dict[str, Any]:
    """Consolidated cross-module aggregates for the home dashboard."""
    v = vehicle_stats()
    bt = bons_travail_stats()
    rf = reformes_stats()
    vt = visites_techniques_stats()

    cout_par_annee = oracle.fetch_all(
        """
        SELECT TO_CHAR(date_entree_parc, 'YYYY') AS annee,
               COALESCE(SUM(COALESCE(montant_piece, 0) + COALESCE(montant_main_oeuvre, 0)
                       + COALESCE(montant_rep_externe, 0)), 0) AS cout,
               COUNT(*) AS nombre
        FROM v_gesparc_bon_travail
        WHERE date_entree_parc IS NOT NULL
          AND EXTRACT(YEAR FROM date_entree_parc) BETWEEN 2012 AND 2100
        GROUP BY TO_CHAR(date_entree_parc, 'YYYY')
        ORDER BY annee
        """
    )

    en_circulation = next(
        (e["n"] for e in v["by_etat"] if e.get("etat_code") == 1), 0
    )

    return {
        "kpis": {
            "vehicules_total": v["total"],
            "en_circulation": en_circulation,
            "bons_travail_total": bt["total"],
            "cout_maintenance_total": bt["cout_total"],
            "reformes_total": rf["total"],
            "reformes_vendus": rf["vendus"],
            "visites_total": vt["total"],
            "visites_expirees": vt["expirees"],
        },
        "parc_par_etat": v["by_etat"],
        "parc_par_energie": v["by_energie"],
        "top_marques": v["by_marque"],
        "bt_par_nature": bt["by_nature"],
        "cout_maintenance_par_annee": cout_par_annee,
    }
