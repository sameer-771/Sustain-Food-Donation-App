from dataclasses import dataclass
from typing import Annotated

from fastapi import Header, HTTPException

from .supabase_config import get_supabase_client


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str
    role: str


def _resolve_user_role(user_id: str, metadata_role: str | None) -> str:
    normalized = (metadata_role or "").strip().lower()
    if normalized in {"donor", "receiver"}:
        return normalized

    try:
        response = (
            get_supabase_client(use_service_role=True)
            .table("profiles")
            .select("role")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if rows:
            profile_role = str(rows[0].get("role") or "").strip().lower()
            if profile_role in {"donor", "receiver"}:
                return profile_role
    except Exception:
        # Fall back to the safest role for permissions.
        pass

    return "receiver"


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

    user_metadata = auth_user.user_metadata or {}
    role = _resolve_user_role(str(auth_user.id), user_metadata.get("role"))

    return AuthenticatedUser(id=str(auth_user.id), email=auth_user.email or "", role=role)
