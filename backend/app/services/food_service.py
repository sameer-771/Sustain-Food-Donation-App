import json
import secrets
from datetime import timedelta
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from ..core.config import EXPIRY_DURATION_SECONDS
from ..core.database import get_connection
from ..core.time_utils import now_iso, parse_iso_datetime
from ..models.mappers import row_to_food
from ..schemas.food import FoodCreate, FoodPatch
from .quality_service import analyze_food_freshness, should_mark_verified

SELECT_FOOD_ID_BY_ID = "SELECT id FROM foods WHERE id = ?"
SELECT_FOOD_BY_ID = "SELECT * FROM foods WHERE id = ?"
PICKUP_TOKEN_PREFIX = "SUSTAIN_PICKUP"
PICKUP_TOKEN_EXPIRY_MINUTES = 15
LISTING_NOT_FOUND_DETAIL = "Listing not found"


def list_foods() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM foods ORDER BY created_at DESC").fetchall()
    return [row_to_food(r) for r in rows]


def create_food(payload: FoodCreate) -> dict[str, Any]:
    with get_connection() as conn:
        exists = conn.execute(SELECT_FOOD_ID_BY_ID, (payload.id,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Listing id already exists")

        conn.execute(
            """
            INSERT INTO foods (
                id, title, description, category, image_url, thumbnail_url,
                donor_json, location_json, location_lat, location_lng, cooked_at, created_at, expires_at,
                servings, freshness, dietary_json, status, claimed, claimed_by, donor_email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                payload.location.lat,
                payload.location.lng,
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

        row = conn.execute(SELECT_FOOD_BY_ID, (payload.id,)).fetchone()

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

        if key == "location":
            set_parts.append("location_lat = ?")
            values.append(float(updates["location"]["lat"]))
            set_parts.append("location_lng = ?")
            values.append(float(updates["location"]["lng"]))

    values.append(food_id)

    with get_connection() as conn:
        existing = conn.execute(SELECT_FOOD_ID_BY_ID, (food_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)

        conn.execute(
            f"UPDATE foods SET {', '.join(set_parts)} WHERE id = ?",
            tuple(values),
        )

        row = conn.execute(SELECT_FOOD_BY_ID, (food_id,)).fetchone()

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


def verify_food_quality(food_id: str, image_bytes: bytes) -> dict[str, Any]:
    with get_connection() as conn:
        existing = conn.execute(SELECT_FOOD_ID_BY_ID, (food_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)

    try:
        quality_result = analyze_food_freshness(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive guard for model/runtime failures
        raise HTTPException(status_code=500, detail="Image analysis failed") from exc

    freshness = str(quality_result["freshness"])
    confidence = float(quality_result["confidence"])
    is_verified = should_mark_verified(freshness, confidence)

    with get_connection() as conn:
        conn.execute(
            """
            UPDATE foods
            SET is_verified = ?, quality_label = ?, quality_confidence = ?
            WHERE id = ?
            """,
            (int(is_verified), freshness, confidence, food_id),
        )
        row = conn.execute(SELECT_FOOD_BY_ID, (food_id,)).fetchone()

    return {
        "food": row_to_food(row),
        "quality": {
            "foodId": food_id,
            "freshness": freshness,
            "confidence": confidence,
            "isVerified": is_verified,
            "topPrediction": quality_result["topPrediction"],
        },
    }


def preview_food_quality(image_bytes: bytes) -> dict[str, Any]:
    try:
        quality_result = analyze_food_freshness(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive guard for model/runtime failures
        raise HTTPException(status_code=500, detail="Image analysis failed") from exc

    freshness = str(quality_result["freshness"])
    confidence = float(quality_result["confidence"])
    is_verified = should_mark_verified(freshness, confidence)

    return {
        "quality": {
            "freshness": freshness,
            "confidence": confidence,
            "isVerified": is_verified,
            "topPrediction": quality_result["topPrediction"],
        },
    }


def _generate_six_digit_code() -> str:
    return str(secrets.randbelow(1_000_000)).zfill(6)


def generate_pickup_code(food_id: str) -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(SELECT_FOOD_BY_ID, (food_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)

        current = row_to_food(row)
        if current["status"] != "claimed":
            raise HTTPException(status_code=400, detail="Pickup code can only be generated for claimed listings")

        conn.execute(
            """
            UPDATE pickup_verifications
            SET used_at = ?
            WHERE food_id = ? AND used_at IS NULL
            """,
            (now_iso(), food_id),
        )

        verification_id = str(uuid4())
        token = str(uuid4())
        pickup_code = _generate_six_digit_code()
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=PICKUP_TOKEN_EXPIRY_MINUTES)).isoformat()
        qr_payload = f"{PICKUP_TOKEN_PREFIX}:{token}"

        conn.execute(
            """
            INSERT INTO pickup_verifications (
                id, food_id, token, code, expires_at, created_at, used_at
            )
            VALUES (?, ?, ?, ?, ?, ?, NULL)
            """,
            (verification_id, food_id, token, pickup_code, expires_at, now_iso()),
        )

    return {
        "foodId": food_id,
        "pickupToken": token,
        "pickupCode": pickup_code,
        "qrPayload": qr_payload,
        "expiresAt": expires_at,
    }


def _parse_scanned_payload(scanned_payload: str | None) -> str | None:
    if not scanned_payload:
        return None
    if scanned_payload.startswith(f"{PICKUP_TOKEN_PREFIX}:"):
        return scanned_payload.split(":", 1)[1]
    return None


def verify_pickup_code(food_id: str, scanned_payload: str | None = None, code: str | None = None) -> dict[str, Any]:
    token = _parse_scanned_payload(scanned_payload)
    if not token and not code:
        raise HTTPException(status_code=400, detail="Provide scannedPayload or code")

    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        food_row = conn.execute(SELECT_FOOD_BY_ID, (food_id,)).fetchone()
        if not food_row:
            raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)

        current = row_to_food(food_row)
        if current["status"] != "claimed":
            raise HTTPException(status_code=400, detail="Listing is not in claimed state")

        verification_row = None
        if token:
            verification_row = conn.execute(
                """
                SELECT * FROM pickup_verifications
                WHERE food_id = ? AND token = ? AND used_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (food_id, token),
            ).fetchone()
        elif code:
            verification_row = conn.execute(
                """
                SELECT * FROM pickup_verifications
                WHERE food_id = ? AND code = ? AND used_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (food_id, code),
            ).fetchone()

        if not verification_row:
            raise HTTPException(status_code=400, detail="Invalid pickup verification code")

        expires_at = parse_iso_datetime(verification_row["expires_at"])
        if now > expires_at:
            raise HTTPException(status_code=400, detail="Pickup verification code has expired")

        conn.execute(
            "UPDATE pickup_verifications SET used_at = ? WHERE id = ?",
            (now_iso(), verification_row["id"]),
        )
        conn.execute(
            "UPDATE foods SET status = ? WHERE id = ?",
            ("completed", food_id),
        )

        updated_food = conn.execute(SELECT_FOOD_BY_ID, (food_id,)).fetchone()

    return {
        "verified": True,
        "food": row_to_food(updated_food),
    }
