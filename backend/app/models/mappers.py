import json
import sqlite3
from typing import Any


def parse_json_field(value: str) -> Any:
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def row_to_user(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
    }


def row_to_food(row: sqlite3.Row) -> dict[str, Any]:
    location = parse_json_field(row["location_json"]) or {}
    if row["location_lat"] is not None:
        location["lat"] = float(row["location_lat"])
    if row["location_lng"] is not None:
        location["lng"] = float(row["location_lng"])

    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "category": row["category"],
        "imageUrl": row["image_url"],
        "thumbnailUrl": row["thumbnail_url"],
        "donor": parse_json_field(row["donor_json"]),
        "location": location,
        "cookedAt": row["cooked_at"],
        "createdAt": row["created_at"],
        "expiresAt": row["expires_at"],
        "servings": row["servings"],
        "freshness": row["freshness"],
        "isVerified": bool(row["is_verified"]),
        "qualityLabel": row["quality_label"],
        "qualityConfidence": row["quality_confidence"],
        "dietary": parse_json_field(row["dietary_json"]) or [],
        "status": row["status"],
        "claimed": bool(row["claimed"]),
        "claimedBy": row["claimed_by"],
        "donorEmail": row["donor_email"],
    }


def row_to_notification(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "type": row["type"],
        "title": row["title"],
        "message": row["message"],
        "timestamp": row["timestamp"],
        "read": bool(row["is_read"]),
        "relatedListingId": row["related_listing_id"],
        "icon": row["icon"],
    }


def row_to_rating(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "listingId": row["listing_id"],
        "userId": row["user_id"],
        "rating": row["rating"],
        "feedback": row["feedback"],
        "timestamp": row["timestamp"],
    }
