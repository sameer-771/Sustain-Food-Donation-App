import json
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from ..core.config import EXPIRY_DURATION_SECONDS
from ..core.database import get_connection
from ..core.time_utils import parse_iso_datetime
from ..models.mappers import row_to_food
from ..schemas.food import FoodCreate, FoodPatch


def list_foods() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM foods ORDER BY created_at DESC").fetchall()
    return [row_to_food(r) for r in rows]


def create_food(payload: FoodCreate) -> dict[str, Any]:
    with get_connection() as conn:
        exists = conn.execute("SELECT id FROM foods WHERE id = ?", (payload.id,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Listing id already exists")

        conn.execute(
            """
            INSERT INTO foods (
                id, title, description, category, image_url, thumbnail_url,
                donor_json, location_json, cooked_at, created_at, expires_at,
                servings, freshness, dietary_json, status, claimed, claimed_by, donor_email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.id,
                payload.title,
                payload.description,
                payload.category,
                payload.imageUrl,
                payload.thumbnailUrl,
                json.dumps(payload.donor.model_dump()),
                json.dumps(payload.location.model_dump()),
                payload.cookedAt,
                payload.createdAt,
                payload.expiresAt,
                payload.servings,
                payload.freshness,
                json.dumps(payload.dietary),
                payload.status,
                int(payload.claimed),
                payload.claimedBy,
                payload.donorEmail,
            ),
        )

        row = conn.execute("SELECT * FROM foods WHERE id = ?", (payload.id,)).fetchone()

    return row_to_food(row)


def patch_food(food_id: str, payload: FoodPatch) -> dict[str, Any]:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    field_map = {
        "title": "title",
        "description": "description",
        "category": "category",
        "imageUrl": "image_url",
        "thumbnailUrl": "thumbnail_url",
        "donor": "donor_json",
        "location": "location_json",
        "cookedAt": "cooked_at",
        "createdAt": "created_at",
        "expiresAt": "expires_at",
        "servings": "servings",
        "freshness": "freshness",
        "dietary": "dietary_json",
        "status": "status",
        "claimed": "claimed",
        "claimedBy": "claimed_by",
        "donorEmail": "donor_email",
    }

    set_parts: list[str] = []
    values: list[Any] = []

    for key, value in updates.items():
        column = field_map[key]
        if key in {"donor", "location", "dietary"}:
            value = json.dumps(value)
        if key == "claimed":
            value = int(bool(value))
        set_parts.append(f"{column} = ?")
        values.append(value)

    values.append(food_id)

    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM foods WHERE id = ?", (food_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Listing not found")

        conn.execute(
            f"UPDATE foods SET {', '.join(set_parts)} WHERE id = ?",
            tuple(values),
        )

        row = conn.execute("SELECT * FROM foods WHERE id = ?", (food_id,)).fetchone()

    return row_to_food(row)


def expire_check() -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    changed_ids: list[str] = []

    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM foods").fetchall()

        for row in rows:
            current = row_to_food(row)
            should_expire = False

            if current["status"] == "available":
                created_at = parse_iso_datetime(current["createdAt"])
                age_seconds = (now - created_at).total_seconds()
                if age_seconds >= EXPIRY_DURATION_SECONDS:
                    should_expire = True

            if current["status"] == "claimed" and current["expiresAt"]:
                expires_at = parse_iso_datetime(current["expiresAt"])
                if now >= expires_at:
                    should_expire = True

            if should_expire:
                changed_ids.append(current["id"])
                conn.execute(
                    "UPDATE foods SET status = ?, claimed = 0 WHERE id = ?",
                    ("expired", current["id"]),
                )

        latest_rows = conn.execute("SELECT * FROM foods ORDER BY created_at DESC").fetchall()

    return {"changed": changed_ids, "foods": [row_to_food(r) for r in latest_rows]}
