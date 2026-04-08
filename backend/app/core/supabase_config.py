import os
from functools import lru_cache

from fastapi import HTTPException
from supabase import Client, create_client


SUPABASE_URL_ENV = "SUPABASE_URL"
SUPABASE_ANON_KEY_ENV = "SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY"


@lru_cache(maxsize=1)
def get_supabase_url() -> str:
    value = os.getenv(SUPABASE_URL_ENV, "").strip()
    if not value:
        raise HTTPException(status_code=500, detail=f"Missing {SUPABASE_URL_ENV} environment variable")
    return value


@lru_cache(maxsize=1)
def get_supabase_anon_key() -> str:
    value = os.getenv(SUPABASE_ANON_KEY_ENV, "").strip()
    if not value:
        raise HTTPException(status_code=500, detail=f"Missing {SUPABASE_ANON_KEY_ENV} environment variable")
    return value


@lru_cache(maxsize=1)
def get_supabase_service_role_key() -> str:
    value = os.getenv(SUPABASE_SERVICE_ROLE_KEY_ENV, "").strip()
    if not value:
        raise HTTPException(status_code=500, detail=f"Missing {SUPABASE_SERVICE_ROLE_KEY_ENV} environment variable")
    return value


def get_supabase_client(use_service_role: bool = True) -> Client:
    key = get_supabase_service_role_key() if use_service_role else get_supabase_anon_key()
    return create_client(get_supabase_url(), key)
