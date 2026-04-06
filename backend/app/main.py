from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import ALLOWED_ORIGINS
from .core.database import init_db
from .core.time_utils import now_iso
from .routers.auth import router as auth_router
from .routers.foods import router as foods_router
from .routers.notifications import router as notifications_router
from .routers.pages import router as pages_router
from .routers.ratings import router as ratings_router
from .routers.stats import router as stats_router
from .routers.users import router as users_router

app = FastAPI(title="Sustain Food Donation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "time": now_iso()}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(foods_router)
app.include_router(notifications_router)
app.include_router(ratings_router)
app.include_router(stats_router)
app.include_router(pages_router)
