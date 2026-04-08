from typing import Annotated, Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .core.config import ALLOWED_ORIGIN_REGEX, ALLOWED_ORIGINS
from .core.database import init_db
from .core.time_utils import now_iso
from .routers.auth import router as auth_router
from .routers.foods import router as foods_router
from .routers.geocoding import router as geocoding_router
from .routers.notifications import router as notifications_router
from .routers.pages import router as pages_router
from .routers.ratings import router as ratings_router
from .routers.stats import router as stats_router
from .routers.users import router as users_router
from .schemas.food import PreviewQualityResponse, VerifyQualityResponse
from .services.food_service import preview_food_quality, verify_food_quality

app = FastAPI(title="Sustain Food Donation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "time": now_iso()}


@app.post(
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


@app.post(
    "/verify-quality-preview",
    response_model=PreviewQualityResponse,
    responses={
        400: {"description": "Invalid image upload"},
    },
)
async def verify_quality_preview(image: Annotated[UploadFile, File(...)]) -> dict[str, Any]:
    image_bytes = await image.read()
    return preview_food_quality(image_bytes=image_bytes)


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(foods_router)
app.include_router(geocoding_router)
app.include_router(notifications_router)
app.include_router(ratings_router)
app.include_router(stats_router)
app.include_router(pages_router)
