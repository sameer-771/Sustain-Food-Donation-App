from datetime import datetime
import logging
from typing import Any

from fastapi import HTTPException

from ..core.supabase_config import get_supabase_client
from ..core.time_utils import now_iso
from ..schemas.rating import RatingCreate


logger = logging.getLogger(__name__)


def _get_donor_rows(
    conn: Any,
    donor_id: str | None,
    donor_email: str | None,
    donor_name: str,
) -> tuple[list[Any], list[Any]]:
    donor_food_rows: list[Any] = []

    normalized_donor_id = (donor_id or "").strip()
    if normalized_donor_id:
        donor_food_rows = (
            conn.table("donations")
            .select("id, donor_json, donor_email, donor_id")
            .eq("donor_id", normalized_donor_id)
            .execute()
        ).data or []

    # Backward-compatible fallback for old records without donor_id.
    if not donor_food_rows:
        all_foods = conn.table("donations").select("id, donor_json, donor_email").execute().data or []
        for food in all_foods:
            row_email = (food.get("donor_email") or "").strip().lower()
            donor_json = food.get("donor_json") or {}
            row_name = (donor_json.get("name") or "").strip().lower()

            match_by_email = bool(donor_email) and row_email == donor_email.strip().lower()
            match_by_name = not donor_email and row_name == donor_name.strip().lower()
            if match_by_email or match_by_name:
                donor_food_rows.append(food)

    listing_ids = [row["id"] for row in donor_food_rows]
    if not listing_ids:
        return [], []

    donor_ratings = conn.table("ratings").select("rating").in_("listing_id", listing_ids).execute().data or []
    return donor_ratings, donor_food_rows


def _update_donor_average(conn: Any, donor_food_rows: list[Any], donor_ratings: list[Any]) -> float | None:
    if not donor_ratings:
        return None

    avg_rating = sum(r["rating"] for r in donor_ratings) / len(donor_ratings)
    rounded_rating = round(avg_rating, 2)

    for donor_food in donor_food_rows:
        donor_json = donor_food.get("donor_json") or {}
        donor_json["rating"] = rounded_rating
        conn.table("donations").update({"donor_json": donor_json}).eq("id", donor_food["id"]).execute()

    return rounded_rating


def _insert_feedback_notification(
    conn: Any,
    donor_name: str,
    listing_title: str,
    listing_id: str,
    feedback_text: str,
    rounded_rating: float | None,
) -> None:
    avg_value = rounded_rating if rounded_rating is not None else 0
    avg_text = f" | Avg donor rating: {avg_value}/5"
    notif_id = f"notif-feedback-{int(datetime.now().timestamp() * 1000)}"
    conn.table("notifications").insert(
        {
            "id": notif_id,
            "type": "feedback",
            "title": f"New feedback for {donor_name}",
            "message": f"Feedback on '{listing_title}': {feedback_text}{avg_text}",
            "timestamp": now_iso(),
            "is_read": False,
            "related_listing_id": listing_id,
            "icon": "message-square",
        }
    ).execute()


def _row_to_rating(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "listingId": row["listing_id"],
        "userId": row["user_id"],
        "rating": row["rating"],
        "feedback": row.get("feedback"),
        "timestamp": row["timestamp"],
    }


def list_ratings() -> list[dict[str, Any]]:
    rows = (
        get_supabase_client(use_service_role=True)
        .table("ratings")
        .select("*")
        .order("timestamp", desc=True)
        .execute()
    ).data or []
    return [_row_to_rating(row) for row in rows]


def create_rating(payload: RatingCreate, actor_user_id: str | None = None) -> dict[str, Any]:
    effective_user_id = (actor_user_id or payload.userId or "").strip()
    if not effective_user_id:
        raise HTTPException(status_code=400, detail="Missing user context for rating")

    client = get_supabase_client(use_service_role=True)
    existing = (
        client.table("ratings")
        .select("id")
        .eq("listing_id", payload.listingId)
        .eq("user_id", effective_user_id)
        .limit(1)
        .execute()
    ).data or []
    if existing:
        raise HTTPException(status_code=409, detail="User already rated this listing")

    inserted = (
        client.table("ratings")
        .insert(
            {
                "listing_id": payload.listingId,
                "user_id": effective_user_id,
                "rating": payload.rating,
                "feedback": payload.feedback,
                "timestamp": payload.timestamp,
            }
        )
        .execute()
    ).data or []

    food_row_list = (
        client.table("donations")
        .select("id, donor_id, donor_json, donor_email, food_name")
        .eq("id", payload.listingId)
        .limit(1)
        .execute()
    ).data or []

    if food_row_list:
        food_row = food_row_list[0]
        donor_info = food_row.get("donor_json") or {}
        donor_name = donor_info.get("name", "Donor")
        donor_email = food_row.get("donor_email")
        donor_id = food_row.get("donor_id")

        rounded_rating: float | None = None
        try:
            donor_ratings, donor_food_rows = _get_donor_rows(client, donor_id, donor_email, donor_name)
            rounded_rating = _update_donor_average(client, donor_food_rows, donor_ratings)
        except Exception as error:
            logger.warning("Failed to update donor average for listing %s: %s", payload.listingId, error)

        feedback_text = (payload.feedback or "").strip()
        if feedback_text:
            rating_for_message = rounded_rating if rounded_rating is not None else float(payload.rating)
            try:
                _insert_feedback_notification(
                    client,
                    donor_name=donor_name,
                    listing_title=food_row.get("food_name") or "Donation",
                    listing_id=payload.listingId,
                    feedback_text=feedback_text,
                    rounded_rating=rating_for_message,
                )
            except Exception as error:
                logger.warning("Failed to create feedback notification for listing %s: %s", payload.listingId, error)

    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to save rating")
    return _row_to_rating(inserted[0])


def has_rated(listing_id: str, user_id: str) -> dict[str, bool]:
    row = (
        get_supabase_client(use_service_role=True)
        .table("ratings")
        .select("id")
        .eq("listing_id", listing_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    ).data or []
    return {"hasRated": bool(row)}
