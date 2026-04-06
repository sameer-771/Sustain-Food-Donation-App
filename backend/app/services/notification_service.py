from typing import Any

from fastapi import HTTPException

from ..core.database import get_connection
from ..core.time_utils import now_iso
from ..models.mappers import row_to_notification
from ..schemas.notification import NotificationCreate


def list_notifications() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM notifications ORDER BY timestamp DESC").fetchall()
    return [row_to_notification(r) for r in rows]


def create_notification(payload: NotificationCreate) -> dict[str, Any]:
    timestamp = payload.timestamp or now_iso()
    with get_connection() as conn:
        exists = conn.execute("SELECT id FROM notifications WHERE id = ?", (payload.id,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Notification id already exists")

        conn.execute(
            """
            INSERT INTO notifications (
                id, type, title, message, timestamp, is_read, related_listing_id, icon
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.id,
                payload.type,
                payload.title,
                payload.message,
                timestamp,
                int(payload.read),
                payload.relatedListingId,
                payload.icon,
            ),
        )

        row = conn.execute("SELECT * FROM notifications WHERE id = ?", (payload.id,)).fetchone()

    return row_to_notification(row)


def mark_notification_read(notification_id: str) -> dict[str, Any]:
    with get_connection() as conn:
        exists = conn.execute(
            "SELECT id FROM notifications WHERE id = ?", (notification_id,)
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Notification not found")

        conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,)
        )
        row = conn.execute(
            "SELECT * FROM notifications WHERE id = ?", (notification_id,)
        ).fetchone()

    return row_to_notification(row)


def mark_all_notifications_read() -> dict[str, int]:
    with get_connection() as conn:
        cursor = conn.execute("UPDATE notifications SET is_read = 1 WHERE is_read = 0")
    return {"updated": cursor.rowcount}
