from typing import Any

from fastapi import HTTPException

from ..core.supabase_config import get_supabase_client
from ..schemas.auth import UserCreate, UserLogin


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
    anon_client = get_supabase_client(use_service_role=False)
    admin_client = get_supabase_client(use_service_role=True)

    try:
        auth_response = anon_client.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {
                    "data": {
                        "username": payload.name,
                        "role": payload.role,
                    }
                },
            }
        )
    except Exception as exc:
        message = str(exc).lower()
        if "already registered" in message or "already" in message:
            raise HTTPException(status_code=409, detail="Email already exists") from exc
        raise HTTPException(status_code=400, detail="Unable to register user") from exc

    auth_user = auth_response.user
    if not auth_user:
        raise HTTPException(
            status_code=400,
            detail="Signup succeeded but user session is unavailable. Disable email confirmation for password auth or verify email first.",
        )

    admin_client.table("profiles").upsert(
        {
            "id": auth_user.id,
            "username": payload.name,
            "email": payload.email,
            "role": payload.role,
        },
        on_conflict="id",
    ).execute()

    return {
        "id": auth_user.id,
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
        raise HTTPException(status_code=401, detail="Invalid credentials") from exc

    auth_user = auth_response.user
    if not auth_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

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
