# GesParc — single-image deploy: build the React SPA, then serve it + the API
# from Django/gunicorn. Business data is read from Postgres (Neon) via PG_DSN.

# ---- Stage 1: build the frontend ----
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
# npm install (not `ci`) tolerates a lockfile written by a newer npm than the
# image's; fine for this app.
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build            # vite build (mode=production → base '/static/')

# ---- Stage 2: Python backend serving API + built SPA ----
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_DEBUG=False

WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
# Bring in the built SPA where settings expects it (REPO_DIR/frontend/dist).
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# Gather the SPA + assets into STATIC_ROOT for WhiteNoise (no DB needed).
RUN python manage.py collectstatic --noinput

# Render/Fly inject $PORT. migrate creates the throwaway sqlite internals.
CMD python manage.py migrate --noinput && \
    gunicorn config.wsgi:application \
      --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120
