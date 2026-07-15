"""
Oracle data-access layer for the GesParc legacy database.

Why raw oracledb instead of the Django ORM:
  The GesParc database runs on Oracle XE 11.2. Modern Django (5.x) only
  supports Oracle Database 19c+ and emits 12c-only SQL (e.g. OFFSET/FETCH
  pagination) that 11.2 rejects. We therefore talk to Oracle directly with
  python-oracledb in *thick* mode (thin mode also requires DB >= 12.1) and
  write 11.2-compatible SQL (ROWNUM pagination) ourselves.

The whole module is a thin, dependency-light wrapper: a lazily-created
session pool plus a few `fetch_*` / `execute` helpers that return plain
dicts with lower-cased column names.
"""
from __future__ import annotations

import os
import threading
from contextlib import contextmanager
from typing import Any, Iterable, Sequence

import oracledb

_pool: oracledb.ConnectionPool | None = None
_pool_lock = threading.Lock()
_thick_initialized = False


def _init_thick_mode() -> None:
    """Enable python-oracledb thick mode using the local Oracle 11.2 client."""
    global _thick_initialized
    if _thick_initialized:
        return
    lib_dir = os.environ.get("ORACLE_CLIENT_LIB_DIR") or None
    # init_oracle_client is process-global; guard against double init.
    try:
        oracledb.init_oracle_client(lib_dir=lib_dir)
    except oracledb.ProgrammingError:
        # Already initialised in this process — that's fine.
        pass
    _thick_initialized = True


def get_pool() -> oracledb.ConnectionPool:
    """Return the shared session pool, creating it on first use."""
    global _pool
    if _pool is not None:
        return _pool
    with _pool_lock:
        if _pool is None:
            _init_thick_mode()
            _pool = oracledb.create_pool(
                user=os.environ["ORACLE_USER"],
                password=os.environ["ORACLE_PASSWORD"],
                dsn=os.environ["ORACLE_DSN"],
                min=1,
                max=8,
                increment=1,
                getmode=oracledb.POOL_GETMODE_WAIT,
            )
    return _pool


@contextmanager
def connection():
    """Acquire a pooled connection (auto-released back to the pool)."""
    pool = get_pool()
    conn = pool.acquire()
    try:
        yield conn
    finally:
        pool.release(conn)


@contextmanager
def cursor():
    with connection() as conn:
        cur = conn.cursor()
        try:
            yield cur
        finally:
            cur.close()


def _rows_as_dicts(cur) -> list[dict[str, Any]]:
    cols = [d[0].lower() for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def fetch_all(sql: str, params: Sequence | dict | None = None) -> list[dict[str, Any]]:
    with cursor() as cur:
        cur.execute(sql, params or {})
        return _rows_as_dicts(cur)


def fetch_one(sql: str, params: Sequence | dict | None = None) -> dict[str, Any] | None:
    with cursor() as cur:
        cur.execute(sql, params or {})
        cols = [d[0].lower() for d in cur.description]
        row = cur.fetchone()
        return dict(zip(cols, row)) if row else None


def fetch_scalar(sql: str, params: Sequence | dict | None = None) -> Any:
    with cursor() as cur:
        cur.execute(sql, params or {})
        row = cur.fetchone()
        return row[0] if row else None


def execute(sql: str, params: Sequence | dict | None = None) -> int:
    """Run an INSERT/UPDATE/DELETE and commit. Returns affected row count."""
    with connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(sql, params or {})
            conn.commit()
            return cur.rowcount
        finally:
            cur.close()


def paginate(
    base_sql: str,
    params: dict,
    *,
    page: int,
    page_size: int,
    order_by: str,
) -> dict[str, Any]:
    """
    Run a SELECT with Oracle 11.2-compatible ROWNUM pagination.

    `base_sql` must be a full SELECT WITHOUT an ORDER BY clause. `order_by`
    is the ORDER BY body (e.g. "num_plaque asc"). Returns a dict with
    `count` (total matching rows) and `results` (the current page).
    """
    page = max(1, int(page))
    page_size = max(1, min(int(page_size), 500))
    min_row = (page - 1) * page_size
    max_row = page * page_size

    count_sql = f"SELECT COUNT(*) FROM ({base_sql})"
    total = fetch_scalar(count_sql, params) or 0

    paged_sql = f"""
        SELECT * FROM (
            SELECT inner_q.*, ROWNUM AS rn__ FROM (
                {base_sql}
                ORDER BY {order_by}
            ) inner_q
            WHERE ROWNUM <= :max_row
        ) WHERE rn__ > :min_row
    """
    p = dict(params)
    p["max_row"] = max_row
    p["min_row"] = min_row
    rows = fetch_all(paged_sql, p)
    for r in rows:
        r.pop("rn__", None)
    return {"count": total, "page": page, "page_size": page_size, "results": rows}
