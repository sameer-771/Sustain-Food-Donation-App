from typing import Any

from pydantic import BaseModel

from .common import DonorInfo, FoodStatus, LocationInfo


class FoodCreate(BaseModel):
    id: str
    title: str
    description: str
    category: str
    imageUrl: str
    thumbnailUrl: str
    donor: DonorInfo
    location: LocationInfo
    cookedAt: str
    createdAt: str
    expiresAt: str
    servings: int
    freshness: str
    dietary: list[str]
    status: FoodStatus
    claimed: bool = False
    claimedBy: str | None = None
    donorEmail: str | None = None


class FoodPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    imageUrl: str | None = None
    thumbnailUrl: str | None = None
    donor: DonorInfo | None = None
    location: LocationInfo | None = None
    cookedAt: str | None = None
    createdAt: str | None = None
    expiresAt: str | None = None
    servings: int | None = None
    freshness: str | None = None
    dietary: list[str] | None = None
    status: FoodStatus | None = None
    claimed: bool | None = None
    claimedBy: str | None = None
    donorEmail: str | None = None


class ExpireCheckResponse(BaseModel):
    changed: list[str]
    foods: list[dict[str, Any]]
