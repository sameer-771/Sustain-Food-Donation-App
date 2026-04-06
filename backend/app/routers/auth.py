from typing import Any

from fastapi import APIRouter

from ..schemas.auth import UserCreate, UserLogin, UserOut
from ..services.auth_service import login_user, register_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserOut,
    responses={409: {"description": "Email already exists"}},
)
def register(payload: UserCreate) -> dict[str, Any]:
    return register_user(payload)


@router.post(
    "/login",
    response_model=UserOut,
    responses={401: {"description": "Invalid credentials"}},
)
def login(payload: UserLogin) -> dict[str, Any]:
    return login_user(payload)
