from typing import Any

from fastapi import HTTPException

from ..core.supabase_config import get_supabase_client
from ..schemas.auth import UserCreate, UserLogin


def _extract_user_id(user_obj: Any) -> str | None:
    if user_obj is None:
        return None
    if isinstance(user_obj, dict):
        value = user_obj.get("id")
        return str(value) if value else None

    value = getattr(user_obj, "id", None)
    return str(value) if value else None


def _map_auth_error(exc: Exception, fallback: str) -> HTTPException:
    message = str(exc).lower()
    if "already" in message or "exists" in message or "registered" in message:
        return HTTPException(status_code=409, detail="Email already exists. Please sign in.")
    if "password" in message and "weak" in message:
        return HTTPException(status_code=400, detail="Password is too weak. Use at least 6 characters.")
    if "invalid" in message and "email" in message:
        return HTTPException(status_code=400, detail="Please use a valid email address.")
    return HTTPException(status_code=400, detail=fallback)


def _read_profile(user_id: str) -> dict[str, Any] | None:
    client = get_supabase_client(use_service_role=True)
    response = (
        client.table("profiles")
        .select("id, username, email, role")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0] if rows else None


def register_user(payload: UserCreate) -> dict[str, Any]:
    admin_client = get_supabase_client(use_service_role=True)

    try:
        auth_response = admin_client.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {
                    "username": payload.name,
                    "role": payload.role,
                },
            }
        )
    except Exception as exc:
        raise _map_auth_error(exc, "Unable to create account right now") from exc

    auth_user = getattr(auth_response, "user", None)
    auth_user_id = _extract_user_id(auth_user)
    if not auth_user_id:
        raise HTTPException(status_code=400, detail="Unable to create account right now")

    admin_client.table("profiles").upsert(
        {
            "id": auth_user_id,
            "username": payload.name,
            "email": payload.email,
            "role": payload.role,
        },
        on_conflict="id",
    ).execute()

    return {
        "id": auth_user_id,
        "name": payload.name,
        "email": payload.email,
        "role": payload.role,
    }


def login_user(payload: UserLogin) -> dict[str, Any]:
    anon_client = get_supabase_client(use_service_role=False)

    try:
        auth_response = anon_client.auth.sign_in_with_password(
            {
                "email": payload.email,
                "password": payload.password,
            }
        )
    except Exception as exc:
        message = str(exc).lower()
        if "email not confirmed" in message:
            raise HTTPException(status_code=401, detail="Please verify your email before signing in") from exc
        raise HTTPException(status_code=401, detail="Invalid email or password") from exc

    auth_user = auth_response.user
    if not auth_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    profile = _read_profile(auth_user.id)
    if not profile:
        user_metadata = auth_user.user_metadata or {}
        profile = {
            "id": auth_user.id,
            "username": user_metadata.get("username") or payload.email.split("@")[0],
            "email": payload.email,
            "role": user_metadata.get("role") or "receiver",
        }
        get_supabase_client(use_service_role=True).table("profiles").upsert(profile, on_conflict="id").execute()

    return {
        "id": auth_user.id,
        "name": profile["username"],
        "email": profile.get("email") or payload.email,
        "role": profile["role"],
    }
