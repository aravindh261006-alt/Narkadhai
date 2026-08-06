"""Settings router."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_owner

router = APIRouter()

# Keys that are safe to expose publicly
PUBLIC_KEYS = {
    "donation_target_amount",
    "qr_code_url",
    "instagram_url",
    "instagram_handle",
    "mission_text",
    "about_text",
    "contact_email",
    "owner_name",
    "owner_bio",
    "owner_photo_url",
}


class SettingsUpdate(BaseModel):
    updates: dict[str, str]


@router.get("")
async def get_settings():
    """Public: return only non-sensitive settings."""
    db = get_supabase()
    resp = db.table("settings").select("key, value").execute()
    return {
        row["key"]: row["value"]
        for row in (resp.data or [])
        if row["key"] in PUBLIC_KEYS
    }


@router.put("")
async def update_settings(
    payload: SettingsUpdate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: update one or more settings."""
    db = get_supabase()
    errors = []
    for key, value in payload.updates.items():
        if key not in PUBLIC_KEYS:
            errors.append(f"Unknown or protected setting key: {key}")
            continue
        db.table("settings").upsert({"key": key, "value": value}).execute()

    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    return {"ok": True}
