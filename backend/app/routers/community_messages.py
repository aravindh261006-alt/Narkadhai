"""Community Messages / Testimonials router."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_audit_or_owner
from app.services.rate_limit import check_rate_limit, get_client_ip

logger = logging.getLogger(__name__)
router = APIRouter()


class CommunityMessageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    message: str = Field(..., min_length=2, max_length=3000)
    # Honeypot field
    website: str | None = Field(default=None)


class CommunityMessageStatusUpdate(BaseModel):
    is_approved: bool


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_community_message(payload: CommunityMessageCreate, request: Request):
    """Public: submit a message or thought to the community wall."""
    if payload.website:
        raise HTTPException(status_code=400, detail="Invalid submission")

    ip = get_client_ip(request)
    check_rate_limit(ip=ip, endpoint="community_message")

    try:
        db = get_supabase()
        resp = db.table("community_messages").insert({
            "name": payload.name.strip(),
            "message": payload.message.strip(),
            "is_approved": False,
        }).execute()

        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to save community message")

        logger.info("Community message submitted by %s", payload.name)
        return {
            "ok": True,
            "message": "Thank you! Your message has been submitted and will appear on the wall once reviewed.",
            "data": resp.data[0],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error saving community message: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit message: {str(e)}")


@router.get("/approved")
@router.get("/approved/")
@router.get("/public")
async def list_approved_community_messages():
    """Public: list all approved community messages."""
    try:
        db = get_supabase()
        resp = (
            db.table("community_messages")
            .select("id, name, message, created_at, is_approved")
            .eq("is_approved", True)
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.error("Error fetching approved community messages: %s", e, exc_info=True)
        return []


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.get("")
@router.get("/")
async def list_all_community_messages(
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin: list all community messages (pending, approved, rejected)."""
    try:
        db = get_supabase()
        resp = (
            db.table("community_messages")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.error("Error listing community messages for admin: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch community messages: {str(e)}")


@router.patch("/{message_id}/status")
@router.patch("/{message_id}/status/")
@router.put("/{message_id}/status")
async def update_community_message_status(
    message_id: str,
    payload: CommunityMessageStatusUpdate,
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin: approve or reject a community message."""
    try:
        db = get_supabase()
        resp = (
            db.table("community_messages")
            .update({"is_approved": payload.is_approved})
            .eq("id", message_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Message not found or update failed")

        logger.info(
            "Community message %s approved=%s by admin %s",
            message_id, payload.is_approved, admin.email,
        )
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating community message status: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update message status: {str(e)}")


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{message_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community_message(
    message_id: str,
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin: delete a community message permanently."""
    try:
        db = get_supabase()
        db.table("community_messages").delete().eq("id", message_id).execute()
        logger.info("Community message %s deleted by admin %s", message_id, admin.email)
    except Exception as e:
        logger.error("Error deleting community message: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")
