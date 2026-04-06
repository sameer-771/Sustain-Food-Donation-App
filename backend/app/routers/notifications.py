from typing import Any

from fastapi import APIRouter

from ..schemas.notification import NotificationCreate
from ..services.notification_service import (
    create_notification,
    list_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def get_notifications() -> list[dict[str, Any]]:
    return list_notifications()


@router.post("", responses={409: {"description": "Notification id already exists"}})
def add_notification(payload: NotificationCreate) -> dict[str, Any]:
    return create_notification(payload)


@router.patch(
    "/{notification_id}/read",
    responses={404: {"description": "Notification not found"}},
)
def update_notification_read(notification_id: str) -> dict[str, Any]:
    return mark_notification_read(notification_id)


@router.patch("/read-all")
def update_all_notifications_read() -> dict[str, int]:
    return mark_all_notifications_read()
