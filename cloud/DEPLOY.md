# GesParc — deploy to Render (free, always-on-ish) with a login gate

The app is now a **single Docker service**: Django serves the React SPA **and**
the API, reads data from **Neon**, and is protected by a **shared-password
gate** (HTTP Basic Auth). This runbook pushes it to GitHub and deploys on
**Render's free tier** (no credit card).

Everything is already committed locally (secrets and big dumps are gitignored).

---

## Phase 1 — Put the code on GitHub

1. Create a GitHub account if you don't have one: <https://github.com/signup>.
2. Create a **new empty repo** named `gesparc` — **do not** add a README/.gitignore
   (we already have commits): <https://github.com/new>.
3. Back in the project folder, connect it and push (replace `<you>`):

   ```bash
   git remote add origin https://github.com/<you>/gesparc.git
   git push -u origin main
   ```

   (If git asks you to sign in, use the browser prompt or a GitHub Personal
   Access Token as the password.)

Your code is now on GitHub — no secrets in it (`.env`, dumps, `venv/`,
`node_modules/` are all ignored).

---

## Phase 2 — Deploy on Render (Blueprint)

1. Sign up at <https://render.com> (log in with GitHub — easiest). No card.
2. **New ▸ Blueprint** → connect your GitHub → pick the **gesparc** repo.
   Render reads [`render.yaml`](../render.yaml) and proposes one **web service**
   (Docker, free plan).
3. It will prompt for the values marked `sync: false` — fill them in:

   | Variable | Value |
   |---|---|
   | `PG_DSN` | your **Neon** connection string (same one in `backend/.env`) |
   | `BASIC_AUTH_USER` | the shared login username (e.g. `tt`) |
   | `BASIC_AUTH_PASS` | a strong shared password — this is what you give your reviewer |
   | `CSRF_TRUSTED_ORIGINS` | leave blank for now (set after step 5 if you add auth later) |

   `DJANGO_SECRET_KEY` is auto-generated; `DJANGO_ALLOWED_HOSTS` is preset to
   `.onrender.com`.
4. **Apply / Create** → Render builds the Docker image (first build ~5–10 min:
   it builds the React app, installs Python deps, collects static, starts gunicorn).
5. When it goes **Live**, you get a URL like **`https://gesparc.onrender.com`**.

> Prefer manual setup? **New ▸ Web Service** → the repo → Runtime **Docker** →
> Health check path `/api/health/` → add the same env vars by hand.

---

## Phase 3 — Try it (and share it)

1. Open your Render URL. The browser shows a **login prompt** → enter the
   `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` you set → the dashboard loads.
2. Give **that URL + those two credentials** to the person who should see it.
   Anyone without them gets a 401. To revoke access later, change
   `BASIC_AUTH_PASS` in the Render dashboard and redeploy.

Health check `https://<you>.onrender.com/api/health/` stays open (no login) so
Render's monitor and any uptime pinger can reach it.

---

## Good to know

- **Free-tier sleep:** the Render service sleeps after ~15 min idle, and Neon's
  compute sleeps too — so the **first** visit after a quiet spell takes ~30–60 s
  to wake, then it's fast. Fine for occasional progress checks. (A free uptime
  pinger hitting `/api/health/` every ~10 min keeps it warmer.)
- **Updating the app:** `git push` to `main` → Render auto-redeploys.
- **Updating the data:** the app reads Neon live, so any change in Neon shows up.
  To add more tables later, extend `BASE_TABLES` in `backend/etl_to_postgres.py`
  and re-run it against Neon (see `cloud/NEON_MIGRATION.md`).
- **A real domain + Cloudflare Access:** if you later point a custom domain at
  the Render service through Cloudflare, we can swap the Basic Auth gate for
  Cloudflare Access (email allowlist) — cleaner UX, no shared password.
