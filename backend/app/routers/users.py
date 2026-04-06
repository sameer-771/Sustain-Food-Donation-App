from typing import Any

from fastapi import APIRouter

from ..schemas.auth import UserOut
from ..services.user_service import list_users

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def get_users() -> list[dict[str, Any]]:
    return list_users()
