from datetime import datetime
from typing import Any

from fastapi import HTTPException

from ..core.database import get_connection
from ..core.time_utils import now_iso
from ..models.mappers import row_to_user
from ..schemas.auth import UserCreate, UserLogin


def register_user(payload: UserCreate) -> dict[str, Any]:
    user_id = f"user-{int(datetime.now().timestamp() * 1000)}"
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (payload.email,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already exists")

        conn.execute(
            """
            INSERT INTO users (id, name, email, password, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, payload.name, payload.email, payload.password, payload.role, now_iso()),
        )

        row = conn.execute(
            "SELECT id, name, email, role FROM users WHERE id = ?", (user_id,)
        ).fetchone()

    return row_to_user(row)


def login_user(payload: UserLogin) -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT id, name, email, role
            FROM users
            WHERE email = ? AND password = ?
            """,
            (payload.email, payload.password),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return row_to_user(row)
