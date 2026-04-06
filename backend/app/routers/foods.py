from typing import Any

from fastapi import APIRouter

from ..schemas.food import FoodCreate, FoodPatch
from ..services.food_service import create_food, expire_check, list_foods, patch_food

router = APIRouter(prefix="/api/foods", tags=["foods"])


@router.get("")
def get_foods() -> list[dict[str, Any]]:
    return list_foods()


@router.post("", responses={409: {"description": "Listing id already exists"}})
def add_food(payload: FoodCreate) -> dict[str, Any]:
    return create_food(payload)


@router.patch(
    "/{food_id}",
    responses={
        400: {"description": "No updates provided"},
        404: {"description": "Listing not found"},
    },
)
def update_food(food_id: str, payload: FoodPatch) -> dict[str, Any]:
    return patch_food(food_id, payload)


@router.post("/expire-check")
def run_expire_check() -> dict[str, Any]:
    return expire_check()
