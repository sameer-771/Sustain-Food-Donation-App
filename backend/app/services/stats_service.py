from ..core.database import get_connection


def impact_stats() -> dict[str, int]:
    with get_connection() as conn:
        foods = conn.execute("SELECT status, servings FROM foods").fetchall()
        donors = conn.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'donor'").fetchone()["count"]

    picked_servings = sum(r["servings"] for r in foods if r["status"] == "picked")
    meals_saved_today = picked_servings
    kg_saved = int(round(picked_servings * 0.45))
    people_fed = picked_servings

    return {
        "mealsSavedToday": meals_saved_today,
        "kgSaved": kg_saved,
        "activeDonors": donors,
        "peopleFed": people_fed,
    }
