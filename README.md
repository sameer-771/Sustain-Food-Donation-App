
# Sustain Food Donation App

A full-stack food donation platform that connects donors and receivers, helps reduce food waste, and supports pickup verification with QR workflows.

## Features

- Donor and receiver auth flows (Supabase Auth)
- Donation listing lifecycle (create, claim, pickup, complete)
- Location-aware map experience
- Quality verification flow for food uploads
- Notifications and activity tracking
- Ratings and impact stats

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI (Python)
- Database/Auth: Supabase (PostgreSQL + Auth + RLS)

## Repository Structure

```text
.
|- App.tsx / index.tsx / pages/ / components/   # Frontend app
|- src/utils/supabaseClient.ts                   # Frontend Supabase client
|- backend/
|  |- app/
|  |  |- routers/                                # API routes
|  |  |- services/                               # Business logic
|  |  |- schemas/                                # Pydantic DTOs
|  |  |- core/                                   # Config + auth + DB glue
|  |- init_supabase.py                           # Programmatic schema init
|  |- supabase_schema.sql                        # SQL editor schema fallback
```

## Prerequisites

- Node.js 18+
- Python 3.11+ (3.12 tested)
- A Supabase project

## Environment Setup

### Frontend (.env)

Create a root `.env` with:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
# Optional override:
# VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Backend (backend/.env)

Create `backend/.env` with:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:<password>@<host>:<port>/postgres
```

## Database Setup

You can initialize schema in either way:

1. Script-based (recommended where DB port access is available)
2. SQL editor fallback (copy and run `backend/supabase_schema.sql` in Supabase SQL Editor)

### Script-based init

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python init_supabase.py
```

## Run Locally

### 1) Start backend

From project root:

```powershell
c:/Users/efssa/Desktop/Sustain-Food-Donation-App-master/backend/.venv/Scripts/python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --env-file backend/.env
```

Backend docs: http://127.0.0.1:8000/docs

Health endpoint: http://127.0.0.1:8000/health

### 2) Start frontend

In a second terminal, from project root:

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend URL: http://127.0.0.1:5173

## Build

```powershell
npm run build
```

## Typical End-to-End Smoke Test

1. Register/login as donor
2. Create a donation
3. Register/login as receiver
4. Claim donation
5. Complete pickup verification
6. Submit a rating

## Security Notes

- Never commit real `.env` files
- Rotate keys immediately if credentials are exposed
- Keep service role key backend-only

## License

No license file is currently defined in this repository.
