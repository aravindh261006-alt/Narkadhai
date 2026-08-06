"""Admin-specific router — dashboard stats, contact message management."""
from typing import Annotated

from fastapi import APIRouter, Depends

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_audit_or_owner, require_owner

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin: summary stats for the dashboard."""
    db = get_supabase()

    totals_resp = db.rpc("get_donation_totals", {}).execute()
    totals = totals_resp.data[0] if totals_resp.data else {}

    recent_donations = (
        db.table("donations")
        .select("id, donor_name, amount, status, created_at")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
        .data or []
    )

    recent_messages = (
        db.table("contact_messages")
        .select("id, name, email, created_at, is_read")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
        .data or []
    )

    unread_count = (
        db.table("contact_messages")
        .select("id", count="exact")
        .eq("is_read", False)
        .execute()
        .count or 0
    )

    target_resp = db.table("settings").select("value").eq("key", "donation_target_amount").execute()
    target = float((target_resp.data or [{}])[0].get("value", 0) or 0)

    return {
        "totals": {
            "reported_total": float(totals.get("reported_total", 0) or 0),
            "verified_total": float(totals.get("verified_total", 0) or 0),
            "reported_count": int(totals.get("reported_count", 0) or 0),
            "verified_count": int(totals.get("verified_count", 0) or 0),
            "target": target,
        },
        "recent_donations": recent_donations,
        "recent_messages": recent_messages,
        "unread_messages": unread_count,
        "admin": {"email": admin.email, "name": admin.name, "role": admin.role},
    }


@router.get("/admins")
async def list_admins(
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: list all authorized admins."""
    db = get_supabase()
    resp = db.table("authorized_admins").select("id, email, name, role, created_at").execute()
    return resp.data or []


@router.post("/admins")
async def add_admin(
    payload: dict,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: add an authorized admin."""
    from pydantic import BaseModel, EmailStr
    db = get_supabase()
    resp = db.table("authorized_admins").insert({
        "email": payload["email"],
        "name": payload["name"],
        "role": payload.get("role", "audit"),
    }).execute()
    return resp.data[0] if resp.data else {}


@router.delete("/admins/{admin_id}")
async def remove_admin(
    admin_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: remove an admin. Cannot remove yourself."""
    db = get_supabase()
    # Prevent owner from removing themselves
    record = db.table("authorized_admins").select("email").eq("id", admin_id).single().execute()
    if record.data and record.data["email"] == admin.email:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access.")
    db.table("authorized_admins").delete().eq("id", admin_id).execute()
    return {"ok": True}
