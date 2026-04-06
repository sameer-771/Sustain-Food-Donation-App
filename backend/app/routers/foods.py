from typing import Annotated, Any

from fastapi import APIRouter, File, Form, UploadFile

from ..schemas.food import (
    FoodCreate,
    FoodPatch,
    GeneratePickupCodeResponse,
    PreviewQualityResponse,
    VerifyPickupRequest,
    VerifyPickupResponse,
    VerifyQualityResponse,
)
from ..services.food_service import (
    create_food,
    expire_check,
    generate_pickup_code,
    list_foods,
    patch_food,
    preview_food_quality,
    verify_pickup_code,
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


@router.post(
    "/{food_id}/pickup-code",
    response_model=GeneratePickupCodeResponse,
    responses={
        400: {"description": "Listing not claimable for pickup code"},
        404: {"description": "Listing not found"},
    },
)
def create_pickup_code(food_id: str) -> dict[str, Any]:
    return generate_pickup_code(food_id)


@router.post(
    "/{food_id}/verify-pickup",
    response_model=VerifyPickupResponse,
    responses={
        400: {"description": "Invalid/expired pickup code"},
        404: {"description": "Listing not found"},
    },
)
def verify_pickup(food_id: str, payload: VerifyPickupRequest) -> dict[str, Any]:
    return verify_pickup_code(
        food_id=food_id,
        scanned_payload=payload.scannedPayload,
        code=payload.code,
    )
