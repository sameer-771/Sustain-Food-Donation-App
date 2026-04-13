from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from ..core.request_auth import AuthenticatedUser, require_authenticated_user
from ..schemas.rating import RatingCreate
from ..services.rating_service import create_rating, has_rated, list_ratings

router = APIRouter(prefix="/api/ratings", tags=["ratings"])


@router.get("")
def get_ratings() -> list[dict[str, Any]]:
    return list_ratings()


@router.post("", responses={409: {"description": "User already rated this listing"}})
def add_rating(
    payload: RatingCreate,
    user: Annotated[AuthenticatedUser, Depends(require_authenticated_user)],
) -> dict[str, Any]:
    return create_rating(payload, actor_user_id=user.id)


@router.get("/has-rated")
def check_has_rated(
    listing_id: Annotated[str, Query(alias="listingId")],
    user_id: Annotated[str, Query(alias="userId")],
) -> dict[str, bool]:
    return has_rated(listing_id, user_id)
