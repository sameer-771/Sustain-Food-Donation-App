# Sustain Backend (Python)

This backend was added without changing any existing frontend files.

## Stack

- FastAPI
- SQLite (file: `backend/sustain.db`)

## Architecture

The backend is now split into many connected Python modules:

- `backend/app/main.py` (app composition + router wiring)
- `backend/app/core/` (config, DB connection, time helpers)
- `backend/app/schemas/` (Pydantic request/response models)
- `backend/app/models/` (row-to-JSON mappers)
- `backend/app/services/` (business logic per domain)
- `backend/app/routers/` (HTTP routes per feature/page)

## Run

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs:

- http://localhost:8000/docs

Health check:

- http://localhost:8000/health

## API Summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users`
- `GET /api/foods`
- `POST /api/foods`
- `PATCH /api/foods/{food_id}`
- `POST /api/foods/expire-check`
- `GET /api/notifications`
- `POST /api/notifications`
- `PATCH /api/notifications/{notification_id}/read`
- `PATCH /api/notifications/read-all`
- `GET /api/ratings`
- `POST /api/ratings`
- `GET /api/ratings/has-rated?listingId=...&userId=...`
- `GET /api/stats/impact`

Page-focused endpoints (for all major frontend views):

- `GET /api/pages/home`
- `GET /api/pages/map`
- `GET /api/pages/activity`
- `GET /api/pages/donor`
- `GET /api/pages/receiver`
- `GET /api/pages/profile`

## Frontend Connection Note

Your current frontend uses `localStorage` directly and does not call API endpoints yet.
This backend is ready and running for the same entities, and can be connected from frontend later when you decide to switch to API calls.
