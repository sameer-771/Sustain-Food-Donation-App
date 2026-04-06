from typing import Annotated, Any

from fastapi import APIRouter, File, Form, UploadFile

from ..schemas.food import (
    FoodCreate,
    FoodPatch,
    PreviewQualityResponse,
    VerifyQualityResponse,
)
from ..services.food_service import (
    create_food,
    expire_check,
    list_foods,
    patch_food,
    preview_food_quality,
    verify_food_quality,
)

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


@router.post(
    "/verify-quality",
    response_model=VerifyQualityResponse,
    responses={
        400: {"description": "Invalid image upload"},
        404: {"description": "Listing not found"},
    },
)
async def verify_quality(
    food_id: Annotated[str, Form(...)],
    image: Annotated[UploadFile, File(...)],
) -> dict[str, Any]:
    image_bytes = await image.read()
    return verify_food_quality(food_id=food_id, image_bytes=image_bytes)


@router.post(
    "/verify-quality-preview",
    response_model=PreviewQualityResponse,
    responses={
        400: {"description": "Invalid image upload"},
    },
)
async def verify_quality_preview(image: Annotated[UploadFile, File(...)]) -> dict[str, Any]:
    image_bytes = await image.read()
    return preview_food_quality(image_bytes=image_bytes)
