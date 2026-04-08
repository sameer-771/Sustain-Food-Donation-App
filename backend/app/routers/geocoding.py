from typing import Annotated, Any

import requests
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/geocoding", tags=["geocoding"])

NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
NOMINATIM_TIMEOUT_SECONDS = 8
HEADERS = {
    "User-Agent": "SustainFoodDonationApp/1.0 (geocoding)",
    "Accept-Language": "en",
}


@router.get("/search", responses={503: {"description": "Geocoding provider unavailable"}})
def search_locations(
    q: Annotated[str, Query(min_length=2)],
    limit: Annotated[int, Query(ge=1, le=10)] = 6,
) -> list[dict[str, Any]]:
    try:
        response = requests.get(
            f"{NOMINATIM_BASE_URL}/search",
            params={
                "format": "json",
                "q": q.strip(),
                "limit": str(limit),
                "addressdetails": "1",
            },
            headers=HEADERS,
            timeout=NOMINATIM_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail="Location search is temporarily unavailable") from exc

    if not response.ok:
        raise HTTPException(status_code=503, detail="Location search provider returned an error")

    data = response.json()
    if not isinstance(data, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        display_name = item.get("display_name")
        lat = item.get("lat")
        lon = item.get("lon")
        place_id = item.get("place_id")
        if not isinstance(display_name, str) or not isinstance(lat, str) or not isinstance(lon, str):
            continue
        normalized.append(
            {
                "display_name": display_name,
                "lat": lat,
                "lon": lon,
                "place_id": int(place_id) if isinstance(place_id, int) else 0,
            }
        )
    return normalized


@router.get("/reverse", responses={503: {"description": "Geocoding provider unavailable"}})
def reverse_location(
    lat: Annotated[float, Query()],
    lng: Annotated[float, Query()],
) -> dict[str, str]:
    try:
        response = requests.get(
            f"{NOMINATIM_BASE_URL}/reverse",
            params={
                "format": "json",
                "lat": str(lat),
                "lon": str(lng),
                "zoom": "18",
            },
            headers=HEADERS,
            timeout=NOMINATIM_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail="Reverse geocoding is temporarily unavailable") from exc

    if not response.ok:
        raise HTTPException(status_code=503, detail="Reverse geocoding provider returned an error")

    data = response.json()
    display_name = data.get("display_name") if isinstance(data, dict) else None
    if not isinstance(display_name, str) or not display_name.strip():
        return {"display_name": f"{lat:.5f}, {lng:.5f}"}

    return {"display_name": display_name}
