from typing import Annotated, Any

from fastapi import APIRouter, Query

from ..services.page_service import (
    activity_page_payload,
    donor_page_payload,
    home_page_payload,
    map_page_payload,
    profile_page_payload,
    receiver_page_payload,
)

router = APIRouter(prefix="/api/pages", tags=["pages"])


@router.get("/home")
def home_page() -> dict[str, Any]:
    return home_page_payload()


@router.get("/map")
def map_page() -> dict[str, Any]:
    return map_page_payload()


@router.get("/activity")
def activity_page() -> dict[str, Any]:
    return activity_page_payload()


@router.get("/donor")
def donor_page() -> dict[str, Any]:
    return donor_page_payload()


@router.get("/receiver")
def receiver_page() -> dict[str, Any]:
    return receiver_page_payload()


@router.get("/profile")
def profile_page(
    donor_email: Annotated[str | None, Query(alias="donorEmail")] = None,
) -> dict[str, Any]:
    return profile_page_payload(donor_email=donor_email)
