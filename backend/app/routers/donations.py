"""Donations router."""
import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.db import get_supabase
from app.services import email_service as email
from app.services.auth_service import AdminUser, require_audit_or_owner
from app.services.rate_limit import check_rate_limit, get_client_ip

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class DonationCreate(BaseModel):
    donor_name: str = Field(..., min_length=1, max_length=200)
    donor_email: EmailStr
    amount: float = Field(
        ...,
        gt=0,
        le=1_000_000,
        description=(
            "Amount in Indian Rupees. "
            "Must be a positive whole number between ₹1 and ₹10,00,000."
        ),
    )
    utr_or_txn_id: str | None = Field(default=None, max_length=100)
    # Honeypot field — must be empty; bots fill it, humans don't
    website: str | None = Field(default=None)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Donation amount must be greater than ₹0.")
        if v > 1_000_000:
            raise ValueError(
                "Donation amount cannot exceed ₹10,00,000 (₹10 lakh) per submission. "
                "For larger contributions please contact us directly."
            )
        # Round to 2 decimal places — prevents floating-point tricks
        return round(v, 2)


class DonationStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(verified|rejected)$")


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@router.get("/totals")
async def get_donation_totals():
    """
    Public: returns only aggregate totals — no PII.

    reported_total = sum of pending + verified donations (self-reported, not yet confirmed)
    verified_total = sum of verified donations only (confirmed against bank/UPI statement)
    These are intentionally separated and clearly labeled; they must NEVER be merged silently.
    """
    db = get_supabase()
    resp = db.rpc("get_donation_totals", {}).execute()
    if resp.data:
        row = resp.data[0]
        return {
            "reported_total": float(row["reported_total"] or 0),
            "verified_total": float(row["verified_total"] or 0),
            "reported_count": int(row["reported_count"] or 0),
            "verified_count": int(row["verified_count"] or 0),
        }
    return {"reported_total": 0, "verified_total": 0, "reported_count": 0, "verified_count": 0}


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_donation(payload: DonationCreate, request: Request):
    """
    Public: donor self-reports a donation.

    Order of operations (IMPORTANT — do not reorder):
    1. Honeypot check (fast, no DB)
    2. Rate limit check (Supabase DB)
    3. Duplicate-submission guard (Supabase DB)
    4. Insert donation record ← the only operation that MUST succeed
    5. Generate screenshot upload URL (optional, non-blocking)
    6. Fetch admin emails (non-blocking)
    7. Send emails (non-blocking — failure is logged, never raised)

    Steps 5-7 must NEVER roll back or prevent step 4 from succeeding.
    """
    # ── 1. Honeypot ──────────────────────────────────────────────────────────
    if payload.website:
        # Return a plausible success-looking 400 so bots don't know they were caught
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid submission")

    # ── 2. Rate limit ─────────────────────────────────────────────────────────
    ip = get_client_ip(request)
    check_rate_limit(ip=ip, endpoint="donate")

    db = get_supabase()

    # ── 3. Duplicate-submission guard ─────────────────────────────────────────
    # Prevents a user from submitting the same (email, amount) pair multiple times
    # within a short window, which would inflate the public "reported" total.
    # Window is 15 minutes — enough to catch accidental double-clicks and bots,
    # but not so long that it blocks legitimate separate donations.
    dedup_cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    dup_check = (
        db.table("donations")
        .select("id", count="exact")
        .eq("donor_email", str(payload.donor_email))
        .eq("amount", payload.amount)
        .gte("created_at", dedup_cutoff)
        .execute()
    )
    if (dup_check.count or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A donation with the same email address and amount was already submitted "
                "within the last 15 minutes. If this is a genuinely separate donation, "
                "please wait 15 minutes before resubmitting. "
                "To report a different amount, you can submit again immediately."
            ),
        )

    # ── 4. Insert donation record (must succeed; nothing after this may block it) ──
    insert_data = {
        "donor_name": payload.donor_name,
        "donor_email": str(payload.donor_email),
        "amount": payload.amount,
        "utr_or_txn_id": payload.utr_or_txn_id,
        "status": "pending",
    }
    resp = db.table("donations").insert(insert_data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save donation record. Please try again.")

    donation = resp.data[0]
    donation_id = donation["id"]

    # ── 5. Generate signed screenshot upload URL (non-blocking) ───────────────
    # The frontend uploads directly to Supabase Storage using this URL.
    # The file NEVER passes through this API (avoids Vercel's 4.5 MB body limit).
    screenshot_upload_url = None
    try:
        signed = db.storage.from_("donation-screenshots").create_signed_upload_url(
            f"{donation_id}/screenshot"
        )
        screenshot_upload_url = signed.get("signedUrl") if signed else None
    except Exception as e:
        logger.warning("Could not generate screenshot upload URL for donation %s: %s", donation_id, e)

    # ── 6. Fetch admin emails (non-blocking) ──────────────────────────────────
    admin_emails: list[str] = []
    try:
        admins_resp = db.table("authorized_admins").select("email").execute()
        admin_emails = [r["email"] for r in (admins_resp.data or [])]
    except Exception as e:
        logger.warning("Could not fetch admin emails for donation notification %s: %s", donation_id, e)

    # ── 7. Send emails (non-blocking — failures are logged, never raised) ──────
    # Both email sends are wrapped independently so one failure doesn't prevent the other.
    donor_email_sent = email.send_donor_thankyou(
        donation_id=donation_id,
        donor_name=payload.donor_name,
        donor_email=str(payload.donor_email),
        amount=payload.amount,
    )
    owner_email_sent = False
    if admin_emails:
        owner_email_sent = email.send_owner_donation_notification(
            donation_id=donation_id,
            owner_emails=admin_emails,
            donor_name=payload.donor_name,
            donor_email=str(payload.donor_email),
            amount=payload.amount,
            utr=payload.utr_or_txn_id,
        )

    logger.info(
        "Donation saved: id=%s amount=%.2f donor_email_sent=%s owner_email_sent=%s",
        donation_id, payload.amount, donor_email_sent, owner_email_sent,
    )

    return {
        "id": donation_id,
        "status": "pending",
        "screenshot_upload_url": screenshot_upload_url,
        "email_sent": donor_email_sent,
        "message": "Thank you! Your donation has been recorded and is pending verification.",
    }


@router.patch("/{donation_id}/screenshot-url")
async def record_screenshot_url(donation_id: str, request: Request):
    """
    After a donor uploads their screenshot to Supabase Storage directly,
    they call this endpoint with the storage path to associate it with
    their donation record.
    """
    body = await request.json()
    screenshot_url = body.get("screenshot_url", "")
    if not screenshot_url:
        raise HTTPException(status_code=400, detail="screenshot_url is required")

    db = get_supabase()
    db.table("donations").update({"screenshot_url": screenshot_url}).eq("id", donation_id).execute()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin-only endpoints
# ---------------------------------------------------------------------------

@router.get("")
@router.get("/")
async def list_donations(
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin: list all donations including PII."""
    try:
        db = get_supabase()
        resp = db.table("donations").select("*").order("created_at", desc=True).execute()
        return resp.data or []
    except Exception as e:
        logger.error("Failed to list donations: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch donations: {str(e)}")


@router.patch("/{donation_id}/status")
@router.patch("/{donation_id}/status/")
@router.put("/{donation_id}/status")
@router.put("/{donation_id}/status/")
async def update_donation_status(
    donation_id: str,
    payload: DonationStatusUpdate,
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """
    Admin: mark a donation as verified or rejected.

    This immediately affects the public tracker:
    - Marking 'verified' moves the amount from reported-only → also verified
    - Marking 'rejected' removes the amount from both reported_total and verified_total
      (rejected status is excluded from the get_donation_totals() Postgres function)
    """
    try:
        db = get_supabase()

        # Confirm the donation exists first
        existing = db.table("donations").select("id, status").eq("id", donation_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Donation not found")

        update_data: dict = {
            "status": payload.status,
            "verified_by": admin.email,
        }
        if payload.status == "verified":
            update_data["verified_at"] = datetime.now(timezone.utc).isoformat()
        elif payload.status == "rejected":
            # Clear verified_at if re-classifying a previously verified donation
            update_data["verified_at"] = None

        resp = db.table("donations").update(update_data).eq("id", donation_id).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to update donation status in database")

        updated = resp.data[0]
        logger.info(
            "Donation %s status changed to '%s' by admin %s",
            donation_id, payload.status, admin.email,
        )
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating donation %s status: %s", donation_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update donation status: {str(e)}")
