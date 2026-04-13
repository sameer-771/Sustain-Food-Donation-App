CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('donor', 'receiver')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.donations (
    id TEXT PRIMARY KEY,
    donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'available',
    description TEXT,
    category TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    donor_json JSONB,
    location_address TEXT,
    location_distance TEXT,
    location_distance_value DOUBLE PRECISION,
    cooked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    freshness TEXT,
    quality_label TEXT,
    quality_confidence DOUBLE PRECISION,
    dietary_json JSONB,
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_by TEXT,
    donor_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_lat_lng ON public.donations(lat, lng);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at DESC);

CREATE TABLE IF NOT EXISTS public.pickup_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id TEXT NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id TEXT NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_listing_id TEXT,
    icon TEXT
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "donations_public_read" ON public.donations;
CREATE POLICY "donations_public_read"
  ON public.donations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "donations_owner_insert" ON public.donations;
CREATE POLICY "donations_owner_insert"
  ON public.donations FOR INSERT
  WITH CHECK (auth.uid() = donor_id);

DROP POLICY IF EXISTS "donations_owner_update" ON public.donations;
CREATE POLICY "donations_owner_update"
  ON public.donations FOR UPDATE
  USING (auth.uid() = donor_id)
  WITH CHECK (auth.uid() = donor_id);
