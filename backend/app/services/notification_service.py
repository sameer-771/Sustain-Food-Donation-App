from typing import Any

from fastapi import HTTPException

from ..core.supabase_config import get_supabase_client
from ..core.time_utils import now_iso
from ..schemas.notification import NotificationCreate


def _row_to_notification(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "type": row["type"],
        "title": row["title"],
        "message": row["message"],
        "timestamp": row.get("timestamp") or now_iso(),
        "read": bool(row.get("is_read")),
        "relatedListingId": row.get("related_listing_id"),
        "icon": row.get("icon"),
    }


def list_notifications() -> list[dict[str, Any]]:
    rows = (
        get_supabase_client(use_service_role=True)
        .table("notifications")
        .select("*")
        .order("timestamp", desc=True)
        .execute()
    ).data or []
    return [_row_to_notification(row) for row in rows]


def create_notification(payload: NotificationCreate) -> dict[str, Any]:
    timestamp = payload.timestamp or now_iso()
    client = get_supabase_client(use_service_role=True)
    existing = client.table("notifications").select("id").eq("id", payload.id).limit(1).execute().data or []
    if existing:
        raise HTTPException(status_code=409, detail="Notification id already exists")

    rows = (
        client.table("notifications")
        .insert(
            {
                "id": payload.id,
                "type": payload.type,
                "title": payload.title,
                "message": payload.message,
                "timestamp": timestamp,
                "is_read": payload.read,
                "related_listing_id": payload.relatedListingId,
                "icon": payload.icon,
            }
        )
        .execute()
    ).data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create notification")
    return _row_to_notification(rows[0])


def mark_notification_read(notification_id: str) -> dict[str, Any]:
    rows = (
        get_supabase_client(use_service_role=True)
        .table("notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .execute()
    ).data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _row_to_notification(rows[0])


def mark_all_notifications_read() -> dict[str, int]:
    rows = (
        get_supabase_client(use_service_role=True)
        .table("notifications")
        .update({"is_read": True})
        .eq("is_read", False)
        .execute()
    ).data or []
    return {"updated": len(rows)}
