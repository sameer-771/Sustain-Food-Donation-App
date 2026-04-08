from dataclasses import dataclass
from typing import Annotated

from fastapi import Header, HTTPException

from .supabase_config import get_supabase_client


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str


def require_authenticated_user(
    authorization: Annotated[str | None, Header()] = None,
) -> AuthenticatedUser:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    try:
        auth_response = get_supabase_client(use_service_role=False).auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc

    auth_user = auth_response.user
    if not auth_user:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")

    return AuthenticatedUser(id=auth_user.id, email=auth_user.email or "")
