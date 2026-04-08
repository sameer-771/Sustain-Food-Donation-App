from ..core.supabase_config import get_supabase_client


def impact_stats() -> dict[str, int]:
    client = get_supabase_client(use_service_role=True)
    foods = client.table("donations").select("status, quantity").execute().data or []
    donor_rows = client.table("profiles").select("id", count="exact").eq("role", "donor").execute()
    donors = donor_rows.count or 0

    picked_servings = sum(
        int(row.get("quantity") or 0)
        for row in foods
        if row.get("status") in {"picked", "completed"}
    )
    meals_saved_today = picked_servings
    kg_saved = int(round(picked_servings * 0.45))
    people_fed = picked_servings

    return {
        "mealsSavedToday": meals_saved_today,
        "kgSaved": kg_saved,
        "activeDonors": donors,
        "peopleFed": people_fed,
    }
