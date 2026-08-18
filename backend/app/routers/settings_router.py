"""Settings router."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_owner

logger = logging.getLogger(__name__)
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
@router.get("/")
async def get_settings():
    """Public: return only non-sensitive settings."""
    try:
        db = get_supabase()
        resp = db.table("settings").select("key, value").execute()
        return {
            row["key"]: row["value"]
            for row in (resp.data or [])
            if row.get("key") in PUBLIC_KEYS
        }
    except Exception as e:
        logger.error("Failed to fetch settings from DB: %s", e, exc_info=True)
        return {}


@router.put("")
@router.put("/")
@router.post("")
@router.post("/")
@router.patch("")
@router.patch("/")
async def update_settings(
    payload: SettingsUpdate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: update one or more settings."""
    try:
        db = get_supabase()
        logger.info("Admin %s updating settings: %s", admin.email, list(payload.updates.keys()))
        errors = []
        for key, value in payload.updates.items():
            if key not in PUBLIC_KEYS:
                errors.append(f"Unknown or protected setting key: {key}")
                continue
            try:
                db.table("settings").upsert({"key": key, "value": str(value)}, on_conflict="key").execute()
            except Exception as item_err:
                logger.error("Failed to upsert setting key '%s': %s", key, item_err, exc_info=True)
                errors.append(f"Failed to save {key}: {str(item_err)}")

        if errors:
            raise HTTPException(status_code=400, detail="; ".join(errors))
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in update_settings: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
