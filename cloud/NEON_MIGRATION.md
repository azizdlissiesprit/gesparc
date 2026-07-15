# GesParc → Neon (free PostgreSQL) — runbook

The app now runs on **PostgreSQL** (ported from Oracle). This gets the data onto
**Neon** — a free, always-on, serverless Postgres, **no credit card**. Then the
backend just needs its `PG_DSN` pointed at Neon.

## What's already done (locally)

✅ Data migrated Oracle → local Postgres and the whole app verified against it.
✅ A ready-to-load Postgres dump: **`cloud/gesparc_pg.sql`** (18 MB, 17 tables,
   ~145 k rows — the focused set the current dashboard uses).

## Phase 1 — Create a Neon project (~2 min)

1. Go to **https://neon.tech** → **Sign up** (GitHub/Google/email). No card.
2. **Create project**:
   - Name: `gesparc`.
   - Postgres version: 16 or 17 (either).
   - Region: pick one near Tunisia (e.g. **AWS eu-central-1 / Frankfurt**).
3. On the project dashboard, open **Connection Details** and copy the
   **connection string**. It looks like:

   ```
   postgresql://<user>:<password>@ep-xxxx-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   Use the **pooled** connection string if offered (host contains `-pooler`) —
   it's better for a web app.

## Phase 2 — Load the data into Neon (one command)

You already have `psql` (PostgreSQL 17). From the project root:

```bash
# Windows (Git Bash / PowerShell) — paste your Neon string:
psql "postgresql://<user>:<password>@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require" \
     -f cloud/gesparc_pg.sql
```

~18 MB over the wire; a couple of minutes. Ignore any `NOTICE` lines.

Verify:

```bash
psql "postgresql://...neon.tech/neondb?sslmode=require" -c \
"SELECT (SELECT count(*) FROM vehicule) AS vehicules,
        (SELECT count(*) FROM bon_travail) AS bons_travail,
        (SELECT count(*) FROM dem_intervention) AS demandes;"
```

Expected: **vehicules 4079 · bons_travail 38627 · demandes 39970**.

## Phase 3 — Point the backend at Neon

Edit **`backend/.env`** and set `PG_DSN` to the Neon string (keep `sslmode=require`):

```
PG_DSN=postgresql://<user>:<password>@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Restart the backend and check:

```bash
curl http://127.0.0.1:8000/api/health/
# {"status":"ok","db_version":"PostgreSQL 16.x ... "}   <- now Neon
```

The app is now reading from the cloud database. 🎉

## Phase 4 — Deploy the app (next step)

With the DB in the cloud, the app itself can go on free hosting:

- **Backend (Django)** → Render (free web service) or Fly.io. Serves `/api`.
  Uses `gunicorn` + the `PG_DSN` env var (set it in the host's dashboard, not in
  a committed file).
- **Frontend (Vite build)** → served either by the same Django (WhiteNoise) or a
  static host (Vercel / Netlify / Cloudflare Pages). Set `VITE_API_BASE_URL` to
  the backend URL (or serve same-origin to avoid CORS).

Tell me when the Neon load is done and I'll wire up the deployment.

## Re-loading / adding more tables later

To refresh or add tables (e.g. when we build the carburant/stock modules),
re-run the ETL straight into Neon (it reads the local Oracle and writes Postgres):

```bash
cd backend
PG_DSN="postgresql://...neon.tech/neondb?sslmode=require" venv/Scripts/python etl_to_postgres.py
```

(Extend `BASE_TABLES` in `etl_to_postgres.py` first if adding tables.)
