# GesParc — Admin Dashboard

A modern admin dashboard for **GesParc** (Gestion de Parc), the Tunisie Telecom
fleet-management system. It replaces the legacy Angular UI with a
**Vite + React + TypeScript + Ant Design** front end backed by a
**Django + DRF** API over the existing **Oracle XE 11.2** database.

```
dbfix/
├── backend/          Django + DRF API (Python venv)
├── frontend/         Vite + React + TS + Ant Design
├── restore/          Oracle migration scripts (DB import — already applied)
├── dump_gesparc.sql  Original PostgreSQL dump
└── schemadump2.sql   Original PostgreSQL schema
```

## Architecture notes

- **The business data lives in PostgreSQL.** The API talks to Postgres directly
  via **psycopg 3** with plain SQL (no Django ORM for business data). See
  [`backend/gesparc/db.py`](backend/gesparc/db.py) (connection pool + helpers)
  and [`backend/gesparc/queries.py`](backend/gesparc/queries.py).
- **How the data got here:** it originated in Oracle (local XE 11.2). For free,
  always-on hosting the app was migrated to Postgres via
  [`backend/etl_to_postgres.py`](backend/etl_to_postgres.py), which copies the
  focused set of tables the dashboard uses and **materializes the two heavy
  Oracle views** (`V_GESPARC_VEHICULE`, `V_GESPARC_BON_TRAVAIL`) as snapshot
  tables — avoiding a deep view-tree translation. To host on the cloud, see
  [`cloud/NEON_MIGRATION.md`](cloud/NEON_MIGRATION.md).
- `db.py` accepts Oracle-style `:name` binds and translates them to psycopg's
  `%(name)s`, so query strings stay readable; pagination is plain LIMIT/OFFSET.
- Django's own `default` DB is a throwaway SQLite file used only for framework
  internals. No app models are defined against it.
- **Auth is intentionally disabled for now** (per project decision). Add it before
  a real deployment.
- The legacy Oracle path (`backend/gesparc/oracle.py`, thick mode, `oracledb`) is
  kept for reference/ETL only; the running app uses Postgres.

## Prerequisites

- PostgreSQL reachable via `PG_DSN` (a local cluster for dev, or Neon for hosting —
  see [`cloud/NEON_MIGRATION.md`](cloud/NEON_MIGRATION.md)).
- Python 3.12, Node 20+ / npm.
- (Only to re-run the ETL) local Oracle XE 11.2 with the `gesparc` schema.

## Running the backend

```bash
cd backend
# first time only:
python -m venv venv
venv/Scripts/python -m pip install -r requirements.txt
venv/Scripts/python manage.py migrate        # creates the internal SQLite tables

# run:
venv/Scripts/python manage.py runserver 127.0.0.1:8000
```

Config lives in `backend/.env` (copy from `.env.example`); set `PG_DSN` to your
Postgres. Health check: <http://127.0.0.1:8000/api/health/> (reports the live
PostgreSQL version).

## Running the frontend

```bash
cd frontend
npm install          # first time only
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api/*` to Django (`vite.config.ts`), so no CORS
setup is needed in development.

## API endpoints (current)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health/` | Readiness + PostgreSQL version |
| GET | `/api/overview/` | Home-dashboard aggregates: KPIs + parc-par-état / énergie / marque, BT-par-nature, maintenance cost by year |
| GET | `/api/vehicles/` | Paginated vehicle list. Params: `search`, `etat`, `num_struct`, `page`, `page_size` |
| GET | `/api/vehicles/stats/` | Fleet KPIs (totals by état / énergie / marque) |
| GET | `/api/vehicles/<num_veh>/` | Full vehicle detail (raw columns + resolved labels) |
| GET | `/api/visites-techniques/` | Paginated technical-inspection list. Params: `search`, `statut`, `num_struct`, `page`, `page_size` |
| GET | `/api/visites-techniques/stats/` | Totals + validity breakdown (valides / bientôt / expirées / montant) |
| GET | `/api/reformes/` | Paginated decommissioning list. Params: `search`, `statut` (`vendu`/`non_vendu`), `num_struct`, `page`, `page_size` |
| GET | `/api/reformes/stats/` | Totals (vendus / non vendus / références / montant) |
| GET | `/api/demandes/` | Paginated intervention-request list. Params: `search`, `statut` (0/1/2), `num_struct`, `page`, `page_size` |
| GET | `/api/demandes/stats/` | Totals (finis / en attente / refusés / véhicules) |
| GET | `/api/bons-travail/` | Paginated work-order list. Params: `search`, `nature` (1/2/3), `mode` (1/2), `etat` (ouverte/cloturee), `num_struct`, `page`, `page_size` |
| GET | `/api/bons-travail/stats/` | Totals (interne/externe, by nature, coût total) |
| GET | `/api/bons-travail/<reference>/` | Work-order detail: header + cost breakdown + facturation + operations |
| GET | `/api/lookups/<name>/` | Reference data: `marques`, `genres`, `energies`, `usages`, `types` (`?marque=`), `structures` (`?search=`), `etats` |

### Bons de travail (work orders)

Read from the `V_GESPARC_BON_TRAVAIL` view (resolves plaque + the three cost
components). `MODE_REP` = nature (`1` Réparation, `2` Remorquage, `3` Entretien —
inferred from data, no lookup table), `MOD` = mode (`1` Interne, `2` Externe).
Cost = pièces + main d'œuvre + réparation externe. Note: `:mode` is an Oracle
reserved word, so the mode bind variable is named `:mode_val`.

### Frais divers (taxes & visites techniques)

`FRAIS_DIVERS` stores several per-vehicle fees discriminated by `NAT_FD`
(`4` = visite technique). `DATE_FD` = validity start, `DATE_VALID_FD` =
validity end. The Visites-techniques module queries `NAT_FD = 4`; the same
backend helper can later serve the Taxes screen via a different nature.
Validity `statut` (`valide` / `bientot` / `expiree` / `inconnu`) is computed
against the Oracle server date.

### Vehicle status codes (`etat_code`)

Computed by the `V_GESPARC_VEHICULE` view: `1` en circulation · `2` en réparation ·
`3` emprunté · `4` sinistré · `5` réformé · `6` vendu.

## Status

**Done (read-only visualization):**
- **Tableau de bord (home)** — cross-module overview: 4 KPI tiles + 5 charts
  (parc par état, BT par nature, top-10 marques, parc par énergie, coût de
  maintenance par année) built with **Recharts**. Chart colors come from the
  validated dataviz reference palette (checked with the palette validator).
- **Vehicles** — list (server pagination, search + état/structure filters), KPI
  cards, detail drawer (Affectation / Carte grise / Exploitation). 4,079 vehicles.
- **Visites techniques** — list (search + statut/structure filters), KPI cards
  with validity breakdown. 1,868 inspections.
- **Réformes** — decommissioning list from `LIGNE_REFORME` (search + vendu/non-vendu
  + structure filters), KPI cards. 2,040 lines / 193 references.
- **Maintenance & réparation (full chain):**
  - **Demandes d'intervention** — request list (`DEM_INTERVENTION`), statut KPIs. 39,970.
  - **Bons de travail** — work-order list (`V_GESPARC_BON_TRAVAIL`) + KPI cards +
    **detail drawer** (Opérations / Coût / Facturation). 38,621 / 11.3M TND.
  - **Sorties des véhicules** — entry/exit + état (ouverte/clôturée) lens over the BTs.
  - **Historique maintenance** — completed-maintenance browser with the shared detail drawer.

**Next:** continue the read-only pattern across the remaining modules (ordres de
mission, assurances / sinistres, carburant, achats, stock). Write operations
(create/update/delete) deferred until the visualization layer is in place.
