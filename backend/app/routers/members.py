"""Members router — public read, owner-only write."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
import time

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_owner

logger = logging.getLogger(__name__)
router = APIRouter()

# Server-side cache for members
_members_cache = {"data": None, "timestamp": 0}
MEMBERS_CACHE_TTL = 300  # 5 minutes in seconds

def invalidate_members_cache():
    _members_cache["data"] = None
    _members_cache["timestamp"] = 0


class MemberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    role: str = Field(..., min_length=1, max_length=100)
    bio: str | None = None
    photo_url: str | None = None
    display_order: int = Field(default=0)


class MemberUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    bio: str | None = None
    photo_url: str | None = None
    display_order: int | None = None


@router.get("")
@router.get("/")
async def list_members(response: Response):
    """Public: list all members ordered by display_order.
    Optimized: selects only id, name, role, photo_url, display_order with 5 min caching.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    now = time.time()
    if _members_cache["data"] is not None and (now - _members_cache["timestamp"]) < MEMBERS_CACHE_TTL:
        return _members_cache["data"]

    try:
        db = get_supabase()
        resp = (
            db.table("members")
            .select("id, name, role, photo_url, display_order")
            .order("display_order", desc=False)
            .execute()
        )
        data = resp.data or []
        _members_cache["data"] = data
        _members_cache["timestamp"] = now
        return data
    except Exception as e:
        logger.error("Failed to list members: %s", e, exc_info=True)
        return _members_cache["data"] or []


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_member(
    payload: MemberCreate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: create a new member."""
    try:
        db = get_supabase()
        logger.info("Admin %s creating member: %s (%s)", admin.email, payload.name, payload.role)
        resp = db.table("members").insert(payload.model_dump()).execute()
        if not resp.data:
            logger.error("Member insert returned no data")
            raise HTTPException(status_code=500, detail="Database returned no record on member create.")
        invalidate_members_cache()
        logger.info("Member created successfully with ID: %s", resp.data[0].get("id"))
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating member: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create member: {str(e)}")


@router.put("/{member_id}")
@router.patch("/{member_id}")
async def update_member(
    member_id: str,
    payload: MemberUpdate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: update a member."""
    try:
        db = get_supabase()
        update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        logger.info("Admin %s updating member %s with fields: %s", admin.email, member_id, list(update_data.keys()))
        resp = db.table("members").update(update_data).eq("id", member_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Member not found or could not be updated")
        invalidate_members_cache()
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating member %s: %s", member_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update member: {str(e)}")


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: delete a member."""
    try:
        db = get_supabase()
        logger.info("Admin %s deleting member %s", admin.email, member_id)
        db.table("members").delete().eq("id", member_id).execute()
        invalidate_members_cache()
    except Exception as e:
        logger.error("Error deleting member %s: %s", member_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete member: {str(e)}")


@router.post("/upload-url")
async def get_member_photo_upload_url(
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: get a signed upload URL for member photos."""
    try:
        import uuid
        db = get_supabase()
        path = f"{uuid.uuid4()}.jpg"
        signed = db.storage.from_("member-photos").create_signed_upload_url(path)
        return {"signed_url": signed.get("signedUrl"), "path": path}
    except Exception as e:
        logger.error("Error getting signed upload URL for member photo: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate upload URL: {str(e)}")
