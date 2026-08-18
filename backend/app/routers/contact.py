"""Contact messages router."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.db import get_supabase
from app.services import email_service as email
from app.services.auth_service import AdminUser, require_audit_or_owner
from app.services.rate_limit import check_rate_limit, get_client_ip

logger = logging.getLogger(__name__)
router = APIRouter()


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    message: str = Field(..., min_length=5, max_length=5000)
    # Honeypot
    website: str | None = Field(default=None)


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_contact(payload: ContactCreate, request: Request):
    """Public: store a contact message and notify the owner."""
    if payload.website:
        raise HTTPException(status_code=400, detail="Invalid submission")

    ip = get_client_ip(request)
    check_rate_limit(ip=ip, endpoint="contact")

    try:
        db = get_supabase()
        logger.info("Received contact form submission from %s (%s)", payload.name, payload.email)
        resp = db.table("contact_messages").insert({
            "name": payload.name,
            "email": str(payload.email),
            "message": payload.message,
            "is_read": False,
        }).execute()

        if not resp.data:
            logger.error("Failed to insert contact message")
            raise HTTPException(status_code=500, detail="Failed to save message in database.")

        message_record = resp.data[0]
        logger.info("Contact message saved successfully with ID: %s", message_record.get("id"))

        # Notify owner/admins (non-blocking)
        try:
            admins_resp = db.table("authorized_admins").select("email").execute()
            admin_emails = [r["email"] for r in (admins_resp.data or [])]
            email.send_contact_notification(
                owner_emails=admin_emails,
                sender_name=payload.name,
                sender_email=str(payload.email),
                message=payload.message,
            )
        except Exception as e:
            logger.warning("Failed to send contact notification: %s", e)

        return {"message": "Your message has been sent. We'll get back to you soon!", "id": message_record.get("id")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error submitting contact form: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit message: {str(e)}")


@router.get("")
@router.get("/")
async def list_messages(
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin: list all contact messages."""
    try:
        db = get_supabase()
        resp = db.table("contact_messages").select("*").order("created_at", desc=True).execute()
        return resp.data or []
    except Exception as e:
        logger.error("Error listing contact messages: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch messages: {str(e)}")


@router.patch("/{message_id}/read")
@router.patch("/{message_id}/read/")
@router.put("/{message_id}/read")
@router.post("/{message_id}/read")
async def mark_read(
    message_id: str,
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin: mark a contact message as read."""
    try:
        db = get_supabase()
        resp = db.table("contact_messages").update({"is_read": True}).eq("id", message_id).execute()
        return {"ok": True, "updated": resp.data}
    except Exception as e:
        logger.error("Error marking message %s as read: %s", message_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update message: {str(e)}")


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: str,
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin: delete a contact message."""
    try:
        db = get_supabase()
        db.table("contact_messages").delete().eq("id", message_id).execute()
    except Exception as e:
        logger.error("Error deleting message %s: %s", message_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")
