from typing import Literal

from pydantic import BaseModel


class DonorInfo(BaseModel):
    name: str
    avatar: str
    rating: float
    verified: bool


class LocationInfo(BaseModel):
    address: str
    lat: float
    lng: float
    distance: str
    distanceValue: float


FoodStatus = Literal["available", "claimed", "picked", "expired"]
