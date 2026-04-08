import json
import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import DB_PATH


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('donor', 'receiver')),
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS foods (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                image_url TEXT NOT NULL,
                thumbnail_url TEXT NOT NULL,
                donor_json TEXT NOT NULL,
                location_json TEXT NOT NULL,
                location_lat REAL,
                location_lng REAL,
                cooked_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                servings INTEGER NOT NULL,
                freshness TEXT NOT NULL,
                is_verified INTEGER NOT NULL DEFAULT 0,
                quality_label TEXT,
                quality_confidence REAL,
                dietary_json TEXT NOT NULL,
                status TEXT NOT NULL,
                claimed INTEGER NOT NULL DEFAULT 0,
                claimed_by TEXT,
                donor_email TEXT
            )
            """
        )

        # Backfill columns for existing databases created before quality verification support.
        food_columns = {
            row["name"] for row in conn.execute("PRAGMA table_info(foods)").fetchall()
        }
        if "is_verified" not in food_columns:
            conn.execute(
                "ALTER TABLE foods ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0"
            )
        if "quality_label" not in food_columns:
            conn.execute("ALTER TABLE foods ADD COLUMN quality_label TEXT")
        if "quality_confidence" not in food_columns:
            conn.execute("ALTER TABLE foods ADD COLUMN quality_confidence REAL")
        if "location_lat" not in food_columns:
            conn.execute("ALTER TABLE foods ADD COLUMN location_lat REAL")
        if "location_lng" not in food_columns:
            conn.execute("ALTER TABLE foods ADD COLUMN location_lng REAL")

        rows_needing_location = conn.execute(
            """
            SELECT id, location_json
            FROM foods
            WHERE location_lat IS NULL OR location_lng IS NULL
            """
        ).fetchall()
        for row in rows_needing_location:
            try:
                location = json.loads(row["location_json"])
            except (TypeError, json.JSONDecodeError):
                continue

            lat = location.get("lat")
            lng = location.get("lng")
            if lat is None or lng is None:
                continue

            conn.execute(
                "UPDATE foods SET location_lat = ?, location_lng = ? WHERE id = ?",
                (float(lat), float(lng), row["id"]),
            )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                related_listing_id TEXT,
                icon TEXT
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ratings (
                id TEXT PRIMARY KEY,
                listing_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                rating INTEGER NOT NULL,
                feedback TEXT,
                timestamp TEXT NOT NULL,
                UNIQUE(listing_id, user_id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pickup_verifications (
                id TEXT PRIMARY KEY,
                food_id TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                code TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                used_at TEXT
            )
            """
        )
