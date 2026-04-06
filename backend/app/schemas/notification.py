from typing import Literal

from pydantic import BaseModel


class NotificationCreate(BaseModel):
    id: str
    type: Literal["claimed", "expired", "donation_posted", "pickup_confirmed", "feedback"]
    title: str
    message: str
    timestamp: str | None = None
    read: bool = False
    relatedListingId: str | None = None
    icon: str | None = None
