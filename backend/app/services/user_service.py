from typing import Any

from ..core.supabase_config import get_supabase_client


def list_users() -> list[dict[str, Any]]:
    rows = (
        get_supabase_client(use_service_role=True)
        .table("profiles")
        .select("id, username, email, role")
        .order("created_at", desc=True)
        .execute()
    ).data or []
    return [
        {
            "id": row["id"],
            "name": row.get("username") or "User",
            "email": row.get("email") or "unknown@example.com",
            "role": row.get("role") or "receiver",
        }
        for row in rows
    ]
