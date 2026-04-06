from datetime import datetime
import json
from typing import Any

from fastapi import HTTPException

from ..core.database import get_connection
from ..models.mappers import row_to_rating
from ..core.time_utils import now_iso
from ..schemas.rating import RatingCreate


def _get_donor_rows(conn: Any, donor_email: str | None, donor_name: str) -> tuple[list[Any], list[Any]]:
    all_foods = conn.execute("SELECT id, donor_json, donor_email FROM foods").fetchall()

    donor_food_rows: list[Any] = []
    for food in all_foods:
        row_email = (food["donor_email"] or "").strip().lower()
        row_name = (json.loads(food["donor_json"]).get("name") or "").strip().lower()

        match_by_email = bool(donor_email) and row_email == donor_email.strip().lower()
        match_by_name = not donor_email and row_name == donor_name.strip().lower()
        if match_by_email or match_by_name:
            donor_food_rows.append(food)

    listing_ids = [row["id"] for row in donor_food_rows]
    if not listing_ids:
        return [], []

    placeholders = ",".join("?" for _ in listing_ids)
    donor_ratings = conn.execute(
        f"SELECT rating FROM ratings WHERE listing_id IN ({placeholders})",
        tuple(listing_ids),
    ).fetchall()
    return donor_ratings, donor_food_rows


def _update_donor_average(conn: Any, donor_food_rows: list[Any], donor_ratings: list[Any]) -> float | None:
    if not donor_ratings:
        return None

    avg_rating = sum(r["rating"] for r in donor_ratings) / len(donor_ratings)
    rounded_rating = round(avg_rating, 2)

    for donor_food in donor_food_rows:
        donor_json = json.loads(donor_food["donor_json"])
        donor_json["rating"] = rounded_rating
        conn.execute(
            "UPDATE foods SET donor_json = ? WHERE id = ?",
            (json.dumps(donor_json), donor_food["id"]),
        )

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
    conn.execute(
        """
        INSERT INTO notifications (
            id, type, title, message, timestamp, is_read, related_listing_id, icon
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            notif_id,
            "feedback",
            f"New feedback for {donor_name}",
            f"Feedback on '{listing_title}': {feedback_text}{avg_text}",
            now_iso(),
            0,
            listing_id,
            "message-square",
        ),
    )


def list_ratings() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM ratings ORDER BY timestamp DESC").fetchall()
    return [row_to_rating(r) for r in rows]


def create_rating(payload: RatingCreate) -> dict[str, Any]:
    rating_id = f"rating-{int(datetime.now().timestamp() * 1000)}"

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM ratings WHERE listing_id = ? AND user_id = ?",
            (payload.listingId, payload.userId),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="User already rated this listing")

        conn.execute(
            """
            INSERT INTO ratings (id, listing_id, user_id, rating, feedback, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                rating_id,
                payload.listingId,
                payload.userId,
                payload.rating,
                payload.feedback,
                payload.timestamp,
            ),
        )

        food_row = conn.execute(
            "SELECT id, donor_json, donor_email, title FROM foods WHERE id = ?",
            (payload.listingId,),
        ).fetchone()

        if food_row:
            donor_info = json.loads(food_row["donor_json"])
            donor_name = donor_info.get("name", "Donor")
            donor_email = food_row["donor_email"]
            donor_ratings, donor_food_rows = _get_donor_rows(conn, donor_email, donor_name)
            rounded_rating = _update_donor_average(conn, donor_food_rows, donor_ratings)

            feedback_text = (payload.feedback or "").strip()
            if feedback_text:
                rating_for_message = rounded_rating if rounded_rating is not None else float(payload.rating)
                _insert_feedback_notification(
                    conn,
                    donor_name=donor_name,
                    listing_title=food_row["title"],
                    listing_id=payload.listingId,
                    feedback_text=feedback_text,
                    rounded_rating=rating_for_message,
                )

        row = conn.execute("SELECT * FROM ratings WHERE id = ?", (rating_id,)).fetchone()

    return row_to_rating(row)


def has_rated(listing_id: str, user_id: str) -> dict[str, bool]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id FROM ratings WHERE listing_id = ? AND user_id = ?",
            (listing_id, user_id),
        ).fetchone()
    return {"hasRated": bool(row)}
