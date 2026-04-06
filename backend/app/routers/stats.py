from fastapi import APIRouter

from ..services.stats_service import impact_stats

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/impact")
def get_impact_stats() -> dict[str, int]:
    return impact_stats()
