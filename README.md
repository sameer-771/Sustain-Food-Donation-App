
# Sustain Food Donation App

Sustain is a full-stack food rescue platform where donors post surplus food and nearby receivers claim it before expiry. It includes quality checks, QR-based pickup verification, notifications, ratings, maps, and impact stats.

This README is intentionally detailed so it can be used as a project handover/PPT reference.

## 1) What The Project Does

### Problem
- Good food gets wasted because donors and receivers are not connected in real time.
- Manual trust and pickup handover are difficult.

### Solution
- Donors post food listings with location and expiry.
- Receivers discover nearby food, claim listings, and complete verified pickup.
- Quality Snap analyzes uploaded food photos.
- Notifications, ratings, and impact analytics track platform activity.

## 2) Core Features

- Role-based experience: donor and receiver accounts.
- Donation lifecycle: create -> available -> claimed -> picked/completed/expired.
- Donor-only delete/remove protection.
- Receiver claim flow with ownership and status checks.
- QR/token + 6-digit code pickup verification.
- Quality Snap (Gemini-first when key is configured).
- Posting gate: donor can post only when quality is acceptable.
- Automatic expiry checks.
- Activity notifications and read states.
- Ratings per listing (1 rating per user per listing).
- Location search/reverse geocoding (Nominatim).
- Impact stats endpoint for dashboards.

## 3) High-Level Architecture

```text
React + TypeScript (Vite)
	-> FastAPI backend
		 -> Supabase (PostgreSQL + Auth + RLS)
		 -> Gemini API (quality analysis, optional but enabled in this project)
		 -> Nominatim (geocoding search/reverse)
```

## 4) Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Framer Motion
- React Leaflet + Leaflet
- Axios
- html5-qrcode + qrcode
- Supabase JS client

### Backend
- FastAPI
- Uvicorn
- Supabase Python client
- SQLAlchemy + Alembic (included for data layer/migrations)
- TensorFlow + Pillow (local image pipeline fallback)
- Requests (external API calls)

### Data/Auth
- Supabase PostgreSQL
- Supabase Auth (JWT bearer token)
- RLS policies on core tables

## 5) Repository Structure

```text
.
|- App.tsx / index.tsx / pages/ / components/   # frontend app and screens
|- src/context/AuthContext.tsx                  # auth/session context
|- src/utils/supabaseClient.ts                  # frontend Supabase client
|- utils/storage.ts                             # frontend API + local cache helpers
|- backend/
|  |- app/main.py                               # FastAPI app composition
|  |- app/routers/                              # endpoint groups
|  |- app/services/                             # domain business logic
|  |- app/schemas/                              # request/response DTOs
|  |- app/core/                                 # config/auth/db/time helpers
|  |- migrations/versions/                      # migration scripts
|  |- init_supabase.py                          # schema setup utility
|  |- supabase_schema.sql                       # manual SQL fallback
|  |- requirements.txt                          # backend deps
|- public/                                      # PWA/static assets
```

## 6) Environment Variables (Manual Creation)

### Create root .env

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
# Optional, usually not needed because frontend auto-targets :8000 on same host
# VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Create backend/.env

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:<password>@<host>:<port>/postgres

# Quality Snap (Gemini)
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.5-flash
```

## 7) Database Setup

Choose one:

1. Script setup: run backend/init_supabase.py (requires DB network access)
2. Manual SQL setup: run backend/supabase_schema.sql in Supabase SQL Editor

Main tables created:
- profiles
- donations
- pickup_verifications
- ratings
- notifications

## 8) Run On Another PC (Step-by-Step)

### Prerequisites
- Node.js 18+
- Python 3.11 or 3.12
- A Supabase project with keys

### A. Clone and install

```powershell
git clone https://github.com/sameer-771/Sustain-Food-Donation-App.git
cd Sustain-Food-Donation-App
npm install
```

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

### B. Create env files
- Create root .env and backend/.env with values from Section 6.

### C. Initialize DB schema

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python init_supabase.py
cd ..
```

If init fails due network/ports, run backend/supabase_schema.sql manually in Supabase SQL Editor.

### D. Start backend (recommended command)

Run from project root in PowerShell:

```powershell
Get-Content "backend/.env" | ForEach-Object {
	if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
		$name = $matches[1].Trim()
		$value = $matches[2].Trim().Trim('"')
		[System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
	}
}
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

### E. Start frontend

In another terminal from project root:

```powershell
npm run dev -- --host 0.0.0.0 --port 5173
```

### F. Open app
- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 9) API Reference

All major API groups are under /api except compatibility quality routes.

### Auth
- POST /api/auth/register
- POST /api/auth/login

### Users
- GET /api/users

### Foods
- GET /api/foods
- POST /api/foods
- PATCH /api/foods/{food_id}
- DELETE /api/foods/{food_id}
- POST /api/foods/expire-check
- POST /api/foods/verify-quality
- POST /api/foods/verify-quality-preview
- POST /api/foods/{food_id}/pickup-code
- POST /api/foods/{food_id}/verify-pickup

### Notifications
- GET /api/notifications
- POST /api/notifications
- PATCH /api/notifications/{notification_id}/read
- PATCH /api/notifications/read-all

### Ratings
- GET /api/ratings
- POST /api/ratings
- GET /api/ratings/has-rated?listingId=<id>&userId=<id>

### Stats
- GET /api/stats/impact

### Geocoding
- GET /api/geocoding/search?q=<query>&limit=<n>
- GET /api/geocoding/reverse?lat=<lat>&lng=<lng>

### Page payload endpoints
- GET /api/pages/home
- GET /api/pages/map
- GET /api/pages/activity
- GET /api/pages/donor
- GET /api/pages/receiver
- GET /api/pages/profile?donorEmail=<email>

### Compatibility quality endpoints (also active)
- POST /verify-quality
- POST /verify-quality-preview

## 10) Business Rules Implemented

- Receiver accounts are receive-only for posting operations.
- Donor can remove only their own listing.
- Claiming own donation is blocked.
- Expired/non-available listings cannot be claimed.
- Pickup verification requires valid token/code and ownership flow.
- Donor posting is quality-gated:
	- Pre-check on uploaded image before create
	- Block if classified Spoiled/bad
	- Post-create verification fallback with rollback (delete listing) if bad

## 11) Quality Snap Details

- If GEMINI_API_KEY is set, Gemini is used as the primary analyzer.
- Current recommended model: gemini-2.5-flash.
- Non-food/garbage/rotten outcomes map to bad quality.
- Frontend badge is simplified to Good Quality vs Bad Quality.

## 12) Demo Flow (For PPT)

1. Register/login as donor.
2. Upload a clearly spoiled image and show posting is blocked.
3. Upload a good image and post donation.
4. Login as receiver and claim donation from home feed.
5. Generate donor pickup code + receiver scan/verify flow.
6. Submit rating and show impact stats.

## 13) Troubleshooting

### Backend fails with ModuleNotFoundError: app
- Use:
	- python -m uvicorn app.main:app --app-dir backend
- Do not use backend.app.main:app in this repo's current startup flow.

### Backend fails with missing SUPABASE_* vars
- Ensure backend/.env exists.
- Ensure env values are loaded into process (PowerShell block in Section 8D).

### Port already in use

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -State Listen | Select-Object LocalPort, OwningProcess
```

Kill conflicting PIDs and restart services.

### Quality analysis returns server error
- Check Gemini quota/rate limits.
- Keep GEMINI_MODEL=gemini-2.5-flash.
- Verify GEMINI_API_KEY is valid and enabled for Generative Language API.

## 14) Security Notes

- Never commit real .env files.
- Keep SUPABASE_SERVICE_ROLE_KEY backend-only.
- Rotate exposed keys immediately.

## 15) License

No explicit license file is currently present in this repository.
