"""
One-shot ETL: copy the tables the GesParc dashboard needs from the local
Oracle XE 11.2 into a PostgreSQL database.

Strategy for a snapshot/demo migration:
  * Copy a focused set of BASE tables the app queries directly.
  * MATERIALIZE the two heavy Oracle views (V_GESPARC_VEHICULE,
    V_GESPARC_BON_TRAVAIL) as plain Postgres tables — we run the Oracle view
    query and store its rows. This avoids translating a deep tree of Oracle
    views/tables (exploitation, piece_article, personnel, …) into Postgres,
    and the backend already treats those names as tables.

Schema is generated from Oracle's cursor.description, so column names/types
always match the live data. Identifiers are created lower-case.

Run:  backend/venv/Scripts/python etl_to_postgres.py
Env overrides: ORACLE_* (see .env) and PG_DSN (default = local dev cluster).
"""
from __future__ import annotations

import os
import sys

import oracledb
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

PG_DSN = os.environ.get(
    "PG_DSN", "host=localhost port=5433 dbname=gesparc user=gesparc"
)

# Base tables copied as-is (the app reads these directly).
BASE_TABLES = [
    "STRUCTURE", "MARQUE_VEHICULE", "GENRE_VEHICULE", "TYPE_VEHICULE",
    "ENERGIE_TAB", "USAGE_VEH", "GOUVERNORAT", "VEHICULE", "FRAIS_DIVERS",
    "REFORME", "LIGNE_REFORME", "BON_TRAVAIL", "LIGNE_BON_TRAVAIL",
    "OPERATION", "DEM_INTERVENTION",
    # Achat (bons de commande) module:
    "FOURNISSEUR", "PARC", "ARTICLE",
]
# Oracle views materialized into Postgres tables of the same name.
VIEW_TABLES = [
    "V_GESPARC_VEHICULE", "V_GESPARC_BON_TRAVAIL",
    # Achat: header + article lines with computed montants.
    "V_GESPARC_PIECE_FOURNISSEUR", "V_GESPARC_LIGNE_FOURNISSEUR",
]

# Helpful indexes for the columns the backend filters / joins on.
INDEXES = {
    "vehicule": ["num_veh", "num_plaque", "marque", "num_struct"],
    "structure": ["num_struct"],
    "frais_divers": ["num_veh", "nat_fd"],
    "ligne_reforme": ["num_plaque", "num_ref"],
    "bon_travail": ["num_bt_int", "num_veh"],
    "ligne_bon_travail": ["num_bt_int"],
    "dem_intervention": ["num_struct", "num_veh"],
    "v_gesparc_vehicule": ["num_veh", "num_struct", "marque", "genre",
                            "etat_vehicule", "num_plaque"],
    "v_gesparc_bon_travail": ["num_bt_int", "num_struct", "num_veh"],
    "type_vehicule": ["type", "marque"],
    "marque_vehicule": ["marque"],
    "genre_vehicule": ["genre"],
    "energie_tab": ["energie"],
    "usage_veh": ["num_usage"],
    # Achat module
    "fournisseur": ["num_fourn"],
    "parc": ["num_parc"],
    "article": ["num_article"],
    "v_gesparc_piece_fournisseur": ["num_piece_int", "num_fourn", "num_parc"],
    "v_gesparc_ligne_fournisseur": ["num_piece_int", "num_article"],
}


def pg_type(desc_col) -> str:
    t = desc_col[1]
    if t == oracledb.DB_TYPE_NUMBER:
        return "numeric"
    if t in (oracledb.DB_TYPE_DATE, oracledb.DB_TYPE_TIMESTAMP,
             oracledb.DB_TYPE_TIMESTAMP_TZ, oracledb.DB_TYPE_TIMESTAMP_LTZ):
        return "timestamp"
    if t in (oracledb.DB_TYPE_BINARY_DOUBLE, oracledb.DB_TYPE_BINARY_FLOAT):
        return "double precision"
    return "text"  # varchar/char/nvarchar/clob/long


def connect_oracle():
    lib = os.environ.get("ORACLE_CLIENT_LIB_DIR") or None
    try:
        oracledb.init_oracle_client(lib_dir=lib)
    except oracledb.ProgrammingError:
        pass
    oracledb.defaults.fetch_lobs = False  # CLOBs come back as str
    return oracledb.connect(
        user=os.environ["ORACLE_USER"],
        password=os.environ["ORACLE_PASSWORD"],
        dsn=os.environ["ORACLE_DSN"],
    )


def copy_one(ocur, pgconn, source: str, target: str) -> int:
    ocur.execute(f"SELECT * FROM {source}")
    cols = [d[0].lower() for d in ocur.description]
    types = [pg_type(d) for d in ocur.description]
    coldefs = ", ".join(f'"{c}" {t}' for c, t in zip(cols, types))
    collist = ", ".join(f'"{c}"' for c in cols)

    with pgconn.cursor() as pc:
        pc.execute(f'DROP TABLE IF EXISTS "{target}" CASCADE')
        pc.execute(f'CREATE TABLE "{target}" ({coldefs})')
        n = 0
        with pc.copy(f'COPY "{target}" ({collist}) FROM STDIN') as copy:
            while True:
                rows = ocur.fetchmany(5000)
                if not rows:
                    break
                for row in rows:
                    copy.write_row(row)
                    n += 1
    pgconn.commit()
    return n


def main() -> int:
    # Optional CLI args: migrate only the named tables (e.g. add a new module's
    # tables to Neon without touching the existing ones). No args = everything.
    only = {a.upper() for a in sys.argv[1:]}
    tables = [t for t in BASE_TABLES + VIEW_TABLES if not only or t in only]
    if only:
        missing = only - set(BASE_TABLES + VIEW_TABLES)
        if missing:
            print(f"Unknown table(s): {', '.join(sorted(missing))}")
            return 1

    print(f"Postgres target: {PG_DSN}")
    print(f"Migrating {len(tables)} table(s): {', '.join(t.lower() for t in tables)}")
    ora = connect_oracle()
    ocur = ora.cursor()
    total = 0
    with psycopg.connect(PG_DSN) as pg:
        for src in tables:
            tgt = src.lower()
            n = copy_one(ocur, pg, src, tgt)
            total += n
            print(f"  {tgt:<28} {n:>8,} rows")
        # indexes (only for the tables we (re)created)
        migrated = {t.lower() for t in tables}
        with pg.cursor() as pc:
            for tbl, colset in INDEXES.items():
                if tbl not in migrated:
                    continue
                for col in colset:
                    idx = f"ix_{tbl}_{col}"
                    pc.execute(
                        f'CREATE INDEX IF NOT EXISTS "{idx}" ON "{tbl}" ("{col}")'
                    )
        pg.commit()
        print("  indexes created")
    ocur.close()
    ora.close()
    print(f"DONE — {len(tables)} tables, {total:,} rows")
    return 0


if __name__ == "__main__":
    sys.exit(main())
