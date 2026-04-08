import json
import math
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from ..core.config import EXPIRY_DURATION_SECONDS
from ..core.supabase_config import get_supabase_client
from ..core.time_utils import now_iso, parse_iso_datetime
from ..schemas.food import FoodCreate, FoodPatch
from .quality_service import analyze_food_freshness

PICKUP_TOKEN_PREFIX = "SUSTAIN_PICKUP"
PICKUP_TOKEN_EXPIRY_MINUTES = 15
LISTING_NOT_FOUND_DETAIL = "Listing not found"
OWNER_ONLY_PATCH_KEYS = {
    "title",
    "description",
    "category",
    "imageUrl",
    "thumbnailUrl",
    "donor",
    "location",
    "cookedAt",
    "createdAt",
    "expiresAt",
    "servings",
    "freshness",
    "dietary",
    "donorEmail",
    "donorId",
}


def _safe_json(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return fallback
    return value


def _row_to_food(row: dict[str, Any]) -> dict[str, Any]:
    donor = _safe_json(row.get("donor_json"), {})
    dietary = _safe_json(row.get("dietary_json"), [])
    created_at = row.get("created_at") or now_iso()

    return {
        "id": row["id"],
        "title": row.get("food_name") or "Untitled Donation",
        "description": row.get("description") or "",
        "category": row.get("category") or "Other",
        "imageUrl": row.get("image_url") or "",
        "thumbnailUrl": row.get("thumbnail_url") or row.get("image_url") or "",
        "donor": donor,
        "location": {
            "address": row.get("location_address") or "Unknown",
            "lat": float(row.get("lat") or 0),
            "lng": float(row.get("lng") or 0),
            "distance": row.get("location_distance") or "0 km away",
            "distanceValue": float(row.get("location_distance_value") or 0),
        },
        "cookedAt": row.get("cooked_at") or created_at,
        "createdAt": created_at,
        "expiresAt": row.get("expires_at") or created_at,
        "servings": int(row.get("quantity") or 0),
        "freshness": row.get("freshness") or "good",
        "isVerified": bool(row.get("is_verified")),
        "qualityLabel": row.get("quality_label"),
        "qualityConfidence": row.get("quality_confidence"),
        "dietary": dietary if isinstance(dietary, list) else [],
        "status": row.get("status") or "available",
        "claimed": bool(row.get("claimed")),
        "claimedBy": row.get("claimed_by"),
        "donorEmail": row.get("donor_email"),
    }


def _read_food_row(food_id: str) -> dict[str, Any] | None:
    response = (
        get_supabase_client(use_service_role=True)
        .table("donations")
        .select("*")
        .eq("id", food_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0] if rows else None


def _assert_owner(existing_row: dict[str, Any], actor_user_id: str) -> None:
    donor_id = existing_row.get("donor_id")
    if not donor_id or donor_id != actor_user_id:
        raise HTTPException(status_code=403, detail="Only the donor can perform this action")


def _is_claim_request(updates: dict[str, Any]) -> bool:
    return updates.get("status") == "claimed" or updates.get("claimed") is True


def _is_completion_request(updates: dict[str, Any]) -> bool:
    return updates.get("status") in {"picked", "completed"}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    )
    return radius * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def list_foods(user_lat: float | None = None, user_lng: float | None = None, radius_km: float = 10) -> list[dict[str, Any]]:
    response = (
        get_supabase_client(use_service_role=True)
        .table("donations")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    rows = response.data or []

    if user_lat is None or user_lng is None:
        return [_row_to_food(row) for row in rows]

    filtered_rows: list[dict[str, Any]] = []
    for row in rows:
        if row.get("status") != "available":
            continue
        lat = row.get("lat")
        lng = row.get("lng")
        if lat is None or lng is None:
            continue
        distance = _haversine_km(float(user_lat), float(user_lng), float(lat), float(lng))
        if distance <= radius_km:
            row["location_distance_value"] = distance
            row["location_distance"] = f"{distance:.1f} km away" if distance >= 1 else f"{max(50, int(distance * 1000))} m away"
            filtered_rows.append(row)

    return [_row_to_food(row) for row in filtered_rows]


def create_food(payload: FoodCreate, actor_user_id: str, actor_email: str) -> dict[str, Any]:
    if payload.donorId and payload.donorId != actor_user_id:
        raise HTTPException(status_code=403, detail="Cannot create a donation for another user")

    existing = _read_food_row(payload.id)
    if existing:
        raise HTTPException(status_code=409, detail="Listing id already exists")

    row = {
        "id": payload.id,
        "donor_id": actor_user_id,
        "food_name": payload.title,
        "quantity": payload.servings,
        "lat": payload.location.lat,
        "lng": payload.location.lng,
        "is_verified": False,
        "status": payload.status,
        "description": payload.description,
        "category": payload.category,
        "image_url": payload.imageUrl,
        "thumbnail_url": payload.thumbnailUrl,
        "donor_json": payload.donor.model_dump(),
        "location_address": payload.location.address,
        "location_distance": payload.location.distance,
        "location_distance_value": payload.location.distanceValue,
        "cooked_at": payload.cookedAt,
        "created_at": payload.createdAt,
        "expires_at": payload.expiresAt,
        "freshness": payload.freshness,
        "dietary_json": payload.dietary,
        "claimed": payload.claimed,
        "claimed_by": payload.claimedBy,
        "donor_email": payload.donorEmail or actor_email,
    }

    response = (
        get_supabase_client(use_service_role=True)
        .table("donations")
        .insert(row)
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Unable to create listing")

    return _row_to_food(rows[0])


def patch_food(food_id: str, payload: FoodPatch, actor_user_id: str, actor_email: str) -> dict[str, Any]:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    existing = _read_food_row(food_id)
    if not existing:
        raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)

    owner_only_request = any(key in OWNER_ONLY_PATCH_KEYS for key in updates)
    if owner_only_request:
        _assert_owner(existing, actor_user_id)

    if _is_claim_request(updates):
        if existing.get("status") != "available":
            raise HTTPException(status_code=409, detail="Listing is not available")
        if existing.get("donor_id") == actor_user_id:
            raise HTTPException(status_code=400, detail="Donor cannot claim own listing")

    if _is_completion_request(updates):
        if existing.get("status") != "claimed":
            raise HTTPException(status_code=400, detail="Only claimed listings can be completed")
        claimed_by = (existing.get("claimed_by") or "").strip().lower()
        actor_email_normalized = actor_email.strip().lower()
        actor_is_claimer = claimed_by and claimed_by == actor_email_normalized
        actor_is_owner = existing.get("donor_id") == actor_user_id
        if not actor_is_claimer and not actor_is_owner:
            raise HTTPException(status_code=403, detail="Only donor or claimer can complete this listing")

    mapped_updates: dict[str, Any] = {}
    for key, value in updates.items():
        if key == "title":
            mapped_updates["food_name"] = value
        elif key == "servings":
            mapped_updates["quantity"] = value
        elif key == "imageUrl":
            mapped_updates["image_url"] = value
        elif key == "thumbnailUrl":
            mapped_updates["thumbnail_url"] = value
        elif key == "donor":
            mapped_updates["donor_json"] = value
        elif key == "location":
            mapped_updates["location_address"] = value.get("address")
            mapped_updates["location_distance"] = value.get("distance")
            mapped_updates["location_distance_value"] = value.get("distanceValue")
            mapped_updates["lat"] = value.get("lat")
            mapped_updates["lng"] = value.get("lng")
        elif key == "cookedAt":
            mapped_updates["cooked_at"] = value
        elif key == "createdAt":
            mapped_updates["created_at"] = value
        elif key == "expiresAt":
            mapped_updates["expires_at"] = value
        elif key == "dietary":
            mapped_updates["dietary_json"] = value
        elif key == "claimedBy":
            mapped_updates["claimed_by"] = value
        elif key == "donorEmail":
            mapped_updates["donor_email"] = value
        elif key == "donorId":
            mapped_updates["donor_id"] = value
        else:
            mapped_updates[key] = value

    if _is_claim_request(updates):
        mapped_updates["status"] = "claimed"
        mapped_updates["claimed"] = True
        mapped_updates["claimed_by"] = actor_email

    if _is_completion_request(updates):
        mapped_updates["claimed"] = True

    response = (
        get_supabase_client(use_service_role=True)
        .table("donations")
        .update(mapped_updates)
        .eq("id", food_id)
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)
    return _row_to_food(rows[0])


def expire_check() -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    changed_ids: list[str] = []
    rows = (
        get_supabase_client(use_service_role=True)
        .table("donations")
        .select("*")
        .execute()
    ).data or []

    for row in rows:
        current = _row_to_food(row)
        should_expire = False

        if current["status"] == "available":
            created_at = parse_iso_datetime(current["createdAt"])
            if (now - created_at).total_seconds() >= EXPIRY_DURATION_SECONDS:
                should_expire = True

        if current["status"] == "claimed" and current["expiresAt"]:
            expires_at = parse_iso_datetime(current["expiresAt"])
            if now >= expires_at:
                should_expire = True

        if should_expire:
            changed_ids.append(current["id"])
            (
                get_supabase_client(use_service_role=True)
                .table("donations")
                .update({"status": "expired", "claimed": False})
                .eq("id", current["id"])
                .execute()
            )

    latest_rows = (
        get_supabase_client(use_service_role=True)
        .table("donations")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    ).data or []

    return {"changed": changed_ids, "foods": [_row_to_food(row) for row in latest_rows]}


def verify_food_quality(food_id: str, image_bytes: bytes, actor_user_id: str) -> dict[str, Any]:
    row = _read_food_row(food_id)
    if not row:
        raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)
    _assert_owner(row, actor_user_id)

    try:
        quality_result = analyze_food_freshness(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail="Image analysis failed") from exc

    freshness = str(quality_result["freshness"])
    confidence = float(quality_result["confidence"])
    is_verified = freshness.lower() == "fresh"

    updated_rows = (
        get_supabase_client(use_service_role=True)
        .table("donations")
        .update(
            {
                "is_verified": is_verified,
                "quality_label": freshness,
                "quality_confidence": confidence,
            }
        )
        .eq("id", food_id)
        .execute()
    ).data or []

    if not updated_rows:
        raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)

    return {
        "food": _row_to_food(updated_rows[0]),
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
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail="Image analysis failed") from exc

    freshness = str(quality_result["freshness"])
    confidence = float(quality_result["confidence"])
    is_verified = freshness.lower() == "fresh"

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


def generate_pickup_code(food_id: str, actor_user_id: str) -> dict[str, Any]:
    row = _read_food_row(food_id)
    if not row:
        raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)
    _assert_owner(row, actor_user_id)

    current = _row_to_food(row)
    if current["status"] != "claimed":
        raise HTTPException(status_code=400, detail="Pickup code can only be generated for claimed listings")

    client = get_supabase_client(use_service_role=True)
    (
        client.table("pickup_verifications")
        .update({"used_at": now_iso()})
        .eq("food_id", food_id)
        .is_("used_at", None)
        .execute()
    )

    token = str(uuid4())
    pickup_code = _generate_six_digit_code()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=PICKUP_TOKEN_EXPIRY_MINUTES)).isoformat()
    qr_payload = f"{PICKUP_TOKEN_PREFIX}:{token}"

    client.table("pickup_verifications").insert(
        {
            "food_id": food_id,
            "token": token,
            "code": pickup_code,
            "expires_at": expires_at,
            "created_at": now_iso(),
            "used_at": None,
        }
    ).execute()

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


def verify_pickup_code(
    food_id: str,
    scanned_payload: str | None = None,
    code: str | None = None,
    actor_user_id: str | None = None,
    actor_email: str | None = None,
) -> dict[str, Any]:
    if not actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = _parse_scanned_payload(scanned_payload)
    if not token and not code:
        raise HTTPException(status_code=400, detail="Provide scannedPayload or code")

    now = datetime.now(timezone.utc)
    food_row = _read_food_row(food_id)
    if not food_row:
        raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)

    current = _row_to_food(food_row)
    if current["status"] != "claimed":
        raise HTTPException(status_code=400, detail="Listing is not in claimed state")

    donor_id = food_row.get("donor_id")
    claimed_by = (current.get("claimedBy") or "").strip().lower()
    actor_email_normalized = (actor_email or "").strip().lower()
    is_claimer = claimed_by and actor_email_normalized and claimed_by == actor_email_normalized
    is_owner = donor_id == actor_user_id
    if not is_claimer and not is_owner:
        raise HTTPException(status_code=403, detail="Only donor or claimer can verify pickup")

    query = (
        get_supabase_client(use_service_role=True)
        .table("pickup_verifications")
        .select("*")
        .eq("food_id", food_id)
        .is_("used_at", None)
        .order("created_at", desc=True)
        .limit(1)
    )
    if token:
        query = query.eq("token", token)
    elif code:
        query = query.eq("code", code)

    verification_rows = query.execute().data or []
    if not verification_rows:
        raise HTTPException(status_code=400, detail="Invalid pickup verification code")

    verification_row = verification_rows[0]
    expires_at = parse_iso_datetime(verification_row["expires_at"])
    if now > expires_at:
        raise HTTPException(status_code=400, detail="Pickup verification code has expired")

    client = get_supabase_client(use_service_role=True)
    client.table("pickup_verifications").update({"used_at": now_iso()}).eq("id", verification_row["id"]).execute()
    updated_food_rows = (
        client.table("donations")
        .update({"status": "completed", "claimed": True})
        .eq("id", food_id)
        .execute()
    ).data or []

    if not updated_food_rows:
        raise HTTPException(status_code=404, detail=LISTING_NOT_FOUND_DETAIL)

    return {
        "verified": True,
        "food": _row_to_food(updated_food_rows[0]),
    }
