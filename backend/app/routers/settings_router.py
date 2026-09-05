"""Settings router."""
import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_owner

logger = logging.getLogger(__name__)
router = APIRouter()

# Keys that are safe to expose publicly
PUBLIC_KEYS = {
    "donation_target_amount",
    "qr_code_url",
    "qr_code_label_1",
    "qr_code_url_2",
    "qr_code_label_2",
    "instagram_url",
    "instagram_handle",
    "mission_text",
    "about_text",
    "contact_email",
    "owner_name",
    "owner_bio",
    "owner_photo_url",
}

# Server-side cache for settings
_settings_cache = {"data": None, "timestamp": 0}
SETTINGS_CACHE_TTL = 300  # 5 minutes in seconds

def invalidate_settings_cache():
    _settings_cache["data"] = None
    _settings_cache["timestamp"] = 0


class SettingsUpdate(BaseModel):
    updates: dict[str, str]


@router.get("")
@router.get("/")
async def get_settings(response: Response):
    """Public: return only non-sensitive settings with 5 min caching."""
    response.headers["Cache-Control"] = "public, max-age=300"
    now = time.time()
    if _settings_cache["data"] is not None and (now - _settings_cache["timestamp"]) < SETTINGS_CACHE_TTL:
        return _settings_cache["data"]

    try:
        db = get_supabase()
        resp = db.table("settings").select("key, value").execute()
        data = {
            row["key"]: row["value"]
            for row in (resp.data or [])
            if row.get("key") in PUBLIC_KEYS
        }
        _settings_cache["data"] = data
        _settings_cache["timestamp"] = now
        return data
    except Exception as e:
        logger.error("Failed to fetch settings from DB: %s", e, exc_info=True)
        return _settings_cache["data"] or {}


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

        invalidate_settings_cache()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in update_settings: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
