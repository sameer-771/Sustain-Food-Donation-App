from typing import Any

from ..core.database import get_connection
from ..models.mappers import row_to_user


def list_users() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, name, email, role FROM users ORDER BY created_at DESC"
        ).fetchall()
    return [row_to_user(r) for r in rows]
