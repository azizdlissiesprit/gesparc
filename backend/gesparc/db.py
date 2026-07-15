"""
PostgreSQL data-access layer for the GesParc dashboard.

The app was first built against Oracle (see git history / etl_to_postgres.py);
for free always-on hosting the data now lives in Postgres. This module keeps the
same tiny helper API the query layer already used (fetch_all / fetch_one /
fetch_scalar / execute / paginate) so `queries.py` changes stayed minimal.

Convenience: SQL is written with Oracle-style `:name` binds and translated to
psycopg's `%(name)s` here, so query strings read the same across the codebase.
"""
from __future__ import annotations

import os
import re
import threading
from contextlib import contextmanager
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None
_lock = threading.Lock()

# :name  ->  %(name)s   (but never touch  ::type  casts)
_BIND_RE = re.compile(r"(?<!:):(\w+)")


def _dsn() -> str:
    return os.environ.get(
        "PG_DSN", "host=localhost port=5433 dbname=gesparc user=gesparc"
    )


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is not None:
        return _pool
    with _lock:
        if _pool is None:
            _pool = ConnectionPool(
                _dsn(),
                min_size=1,
                max_size=8,
                kwargs={"row_factory": dict_row},
                open=True,
            )
    return _pool


def _translate(sql: str) -> str:
    return _BIND_RE.sub(r"%(\1)s", sql)


@contextmanager
def _cursor():
    with get_pool().connection() as conn:
        with conn.cursor() as cur:
            yield cur


def fetch_all(sql: str, params: dict | None = None) -> list[dict[str, Any]]:
    with _cursor() as cur:
        cur.execute(_translate(sql), params or {})
        return list(cur.fetchall())


def fetch_one(sql: str, params: dict | None = None) -> dict[str, Any] | None:
    with _cursor() as cur:
        cur.execute(_translate(sql), params or {})
        return cur.fetchone()


def fetch_scalar(sql: str, params: dict | None = None) -> Any:
    with _cursor() as cur:
        cur.execute(_translate(sql), params or {})
        row = cur.fetchone()
        if not row:
            return None
        return next(iter(row.values()))


def execute(sql: str, params: dict | None = None) -> int:
    with get_pool().connection() as conn:
        with conn.cursor() as cur:
            cur.execute(_translate(sql), params or {})
            return cur.rowcount


def paginate(
    base_sql: str,
    params: dict,
    *,
    page: int,
    page_size: int,
    order_by: str,
) -> dict[str, Any]:
    """Standard LIMIT/OFFSET pagination. `base_sql` is a full SELECT without an
    ORDER BY; `order_by` is the ORDER BY body (e.g. "num_plaque ASC")."""
    page = max(1, int(page))
    page_size = max(1, min(int(page_size), 500))
    p = dict(params)
    total = fetch_scalar(f"SELECT COUNT(*) AS c FROM ({base_sql}) sub", p) or 0
    p["_limit"] = page_size
    p["_offset"] = (page - 1) * page_size
    rows = fetch_all(
        f"{base_sql} ORDER BY {order_by} LIMIT :_limit OFFSET :_offset", p
    )
    return {
        "count": int(total),
        "page": page,
        "page_size": page_size,
        "results": rows,
    }
