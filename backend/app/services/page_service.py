from typing import Any

from ..services.food_service import list_foods
from ..services.notification_service import list_notifications
from ..services.rating_service import list_ratings
from ..services.stats_service import impact_stats


def home_page_payload() -> dict[str, Any]:
    foods = list_foods()
    return {
        "featured": foods[:8],
        "impact": impact_stats(),
    }


def map_page_payload() -> dict[str, Any]:
    foods = list_foods()
    return {"listings": foods}


def activity_page_payload() -> dict[str, Any]:
    return {"notifications": list_notifications()}


def donor_page_payload() -> dict[str, Any]:
    foods = list_foods()
    return {
        "myListings": foods,
        "impact": impact_stats(),
    }


def receiver_page_payload() -> dict[str, Any]:
    foods = list_foods()
    return {
        "available": [f for f in foods if f.get("status") == "available"],
        "claimed": [f for f in foods if f.get("status") == "claimed"],
        "picked": [f for f in foods if f.get("status") == "picked"],
        "expired": [f for f in foods if f.get("status") == "expired"],
    }


def profile_page_payload(donor_email: str | None = None) -> dict[str, Any]:
    foods = list_foods()
    notifications = list_notifications()
    ratings = list_ratings()

    donor_profile: dict[str, Any] | None = None
    if donor_email:
        donor_foods = [f for f in foods if f.get("donorEmail") == donor_email]
        if donor_foods:
            donor_info = donor_foods[0].get("donor") or {}
            listing_ids = {f.get("id") for f in donor_foods}
            donor_feedback = [r for r in ratings if r.get("listingId") in listing_ids]
            donor_profile = {
                "email": donor_email,
                "name": donor_info.get("name"),
                "rating": donor_info.get("rating"),
                "feedbackCount": len(donor_feedback),
                "feedback": donor_feedback,
            }

    return {
        "notifications": notifications,
        "impact": impact_stats(),
        "donorProfile": donor_profile,
    }
