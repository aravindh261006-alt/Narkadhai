"""Admin-specific router — dashboard stats, contact message management."""
import logging
import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings as cfg
from app.db import get_supabase
from app.services import email_service as email
from app.services.auth_service import AdminUser, require_audit_or_owner, require_owner

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/dashboard")
@router.get("/dashboard/")
async def get_dashboard(
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin: summary stats for the dashboard."""
    try:
        db = get_supabase()

        # 1. Fetch donations and calculate totals accurately
        donations_resp = (
            db.table("donations")
            .select("id, donor_name, donor_email, amount, status, created_at")
            .order("created_at", desc=True)
            .execute()
        )
        all_donations = donations_resp.data or []

        reported_total = sum(float(d.get("amount") or 0) for d in all_donations if d.get("status") != "rejected")
        verified_total = sum(float(d.get("amount") or 0) for d in all_donations if d.get("status") == "verified")
        reported_count = sum(1 for d in all_donations if d.get("status") != "rejected")
        verified_count = sum(1 for d in all_donations if d.get("status") == "verified")

        recent_donations = all_donations[:5]

        # 2. Fetch contact messages and unread count
        messages_resp = (
            db.table("contact_messages")
            .select("id, name, email, message, created_at, is_read")
            .order("created_at", desc=True)
            .execute()
        )
        all_messages = messages_resp.data or []
        recent_messages = all_messages[:5]
        unread_count = sum(1 for m in all_messages if not m.get("is_read"))

        # 3. Fetch donation target
        target = 0.0
        try:
            target_resp = db.table("settings").select("value").eq("key", "donation_target_amount").execute()
            if target_resp.data and len(target_resp.data) > 0:
                val = target_resp.data[0].get("value")
                if val is not None:
                    target = float(val)
        except Exception as e:
            logger.warning("Could not parse donation_target_amount: %s", e)

        logger.info(
            "Dashboard stats loaded: reported=%s verified=%s unread=%s donations_count=%s",
            reported_total, verified_total, unread_count, len(all_donations),
        )

        return {
            "totals": {
                "reported_total": reported_total,
                "verified_total": verified_total,
                "reported_count": reported_count,
                "verified_count": verified_count,
                "target": target,
            },
            "recent_donations": recent_donations,
            "recent_messages": recent_messages,
            "unread_messages": unread_count,
            "admin": {"email": admin.email, "name": admin.name, "role": admin.role},
        }
    except Exception as e:
        logger.error("Error generating dashboard stats: %s", e, exc_info=True)
        return {
            "totals": {
                "reported_total": 0.0,
                "verified_total": 0.0,
                "reported_count": 0,
                "verified_count": 0,
                "target": 0.0,
            },
            "recent_donations": [],
            "recent_messages": [],
            "unread_messages": 0,
            "admin": {"email": admin.email, "name": admin.name, "role": admin.role},
        }


class CheckAuthorizedPayload(BaseModel):
    email: str


@router.post("/check-authorized")
async def check_admin_authorized(payload: CheckAuthorizedPayload):
    """Check if an email is in authorized_admins table before sending magic links."""
    email_val = payload.email.strip().lower()
    if not email_val or not re.match(r"[^@]+@[^@]+\.[^@]+", email_val):
        return {"authorized": False}

    db = get_supabase()
    resp = db.table("authorized_admins").select("id, role").ilike("email", email_val).execute()
    if resp.data and len(resp.data) > 0:
        return {"authorized": True, "role": resp.data[0].get("role", "audit")}
    return {"authorized": False}


@router.get("/verify-access")
async def verify_admin_access(
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Verify current caller has active admin access. Rejects non-admins with 403."""
    return {"ok": True, "email": admin.email, "name": admin.name, "role": admin.role}


@router.get("/me")
async def get_me(
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Get profile of current logged-in admin."""
    return {"email": admin.email, "name": admin.name, "role": admin.role}


@router.get("/admins")
async def list_admins(
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: list all authorized admins including their last login."""
    db = get_supabase()
    resp = db.table("authorized_admins").select("id, email, name, role, created_at").execute()
    admins = resp.data or []

    # Query auth.users to map last_sign_in_at as last_login
    auth_users = []
    try:
        auth_users = db.auth.admin.list_users()
    except Exception as e:
        logger.warning("Failed to retrieve Supabase Auth users list: %s", e)

    email_to_last_login = {}
    for u in auth_users:
        if u.email:
            # last_sign_in_at is a datetime object or None; convert to ISO string if present
            email_to_last_login[u.email.lower().strip()] = (
                u.last_sign_in_at.isoformat() if u.last_sign_in_at else None
            )

    for a in admins:
        email_key = a["email"].lower().strip()
        a["last_login"] = email_to_last_login.get(email_key)

    return admins


@router.post("/admins")
async def add_admin(
    payload: dict,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: add an authorized admin, automatically provision auth user with default password, and send welcome email."""
    email_val = payload.get("email", "").strip().lower()
    role_val = payload.get("role", "audit").strip().lower()

    if not email_val or not re.match(r"[^@]+@[^@]+\.[^@]+", email_val):
        raise HTTPException(status_code=400, detail="Invalid email address.")

    if role_val not in ("owner", "audit"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'owner' or 'audit'.")

    if email_val == "narkadhai.official@gmail.com" and role_val != "owner":
        raise HTTPException(status_code=400, detail="narkadhai.official@gmail.com must always keep the 'owner' role.")

    db = get_supabase()

    # Check if already exists in authorized_admins
    existing = db.table("authorized_admins").select("id").eq("email", email_val).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Admin email is already authorized.")

    name_val = email_val.split("@")[0]
    default_password = "Narkadhai@2024"

    # Automatically create or update Supabase Auth user with default password
    auth_user_id = None
    try:
        users = db.auth.admin.list_users()
        for u in users:
            if u.email and u.email.lower().strip() == email_val:
                auth_user_id = u.id
                break
    except Exception as e:
        logger.warning("Failed to list users to check existence: %s", e)

    if auth_user_id:
        try:
            db.auth.admin.update_user_by_id(
                auth_user_id,
                {
                    "password": default_password,
                    "email_confirm": True,
                    "user_metadata": {"name": name_val, "role": role_val},
                }
            )
            logger.info("Updated existing auth user %s with default password", email_val)
        except Exception as e:
            logger.error("Failed to update existing auth user %s: %s", email_val, e)
            raise HTTPException(status_code=500, detail=f"Failed to update auth user credentials: {e}")
    else:
        try:
            db.auth.admin.create_user({
                "email": email_val,
                "password": default_password,
                "email_confirm": True,
                "user_metadata": {"name": name_val, "role": role_val},
            })
            logger.info("Created Supabase Auth user for %s with default password", email_val)
        except Exception as e:
            logger.error("Failed to create Supabase Auth user for %s: %s", email_val, e)
            raise HTTPException(status_code=500, detail=f"Failed to create auth user: {e}")

    # 1. Insert into authorized_admins table
    resp = db.table("authorized_admins").insert({
        "email": email_val,
        "name": name_val,
        "role": role_val,
    }).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to authorize admin in database.")

    # 2. Send welcome email with login credentials
    email_sent = email.send_admin_welcome_email(
        admin_email=email_val,
        default_password=default_password,
        role=role_val,
    )

    result = dict(resp.data[0])
    if not email_sent:
        result["warning"] = "Admin account created with default password, but welcome email could not be sent."

    return result


@router.delete("/admins/{admin_id}")
async def remove_admin(
    admin_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: remove an admin. Cannot remove narkadhai.official@gmail.com or yourself."""
    db = get_supabase()
    record = db.table("authorized_admins").select("email").eq("id", admin_id).single().execute()
    if not record.data:
        raise HTTPException(status_code=404, detail="Admin not found")

    email_val = record.data["email"].lower().strip()

    if email_val == "narkadhai.official@gmail.com":
        raise HTTPException(status_code=400, detail="The owner narkadhai.official@gmail.com cannot be removed.")

    if email_val == admin.email.lower().strip():
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access.")

    # 1. Delete from authorized_admins table
    db.table("authorized_admins").delete().eq("id", admin_id).execute()

    # 2. Search and delete from Supabase Auth (auth.users)
    auth_user_id = None
    try:
        users = db.auth.admin.list_users()
        for u in users:
            if u.email and u.email.lower().strip() == email_val:
                auth_user_id = u.id
                break
    except Exception as e:
        logger.warning("Failed to locate user in Supabase Auth: %s", e)

    if auth_user_id:
        try:
            db.auth.admin.delete_user(auth_user_id)
            logger.info("Deleted auth user %s from Supabase Auth", email_val)
        except Exception as e:
            logger.error("Failed to delete user %s from Supabase Auth: %s", email_val, e)

    return {"ok": True}


class ChangeEmailPayload(BaseModel):
    new_email: str


class ChangePasswordPayload(BaseModel):
    new_password: str


@router.post("/change-email")
async def change_my_email(
    payload: ChangeEmailPayload,
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin self-service: update own email address in authorized_admins and Supabase Auth."""
    new_email_val = payload.new_email.strip().lower()
    if not new_email_val or not re.match(r"[^@]+@[^@]+\.[^@]+", new_email_val):
        raise HTTPException(status_code=400, detail="Invalid email address.")

    old_email_val = admin.email.strip().lower()
    if old_email_val == new_email_val:
        raise HTTPException(status_code=400, detail="New email must be different from current email.")

    db = get_supabase()

    # Check if new email is already in authorized_admins
    existing = db.table("authorized_admins").select("id").eq("email", new_email_val).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="An admin with this email already exists.")

    # 1. Update in authorized_admins table
    update_res = (
        db.table("authorized_admins")
        .update({"email": new_email_val, "name": new_email_val.split("@")[0]})
        .ilike("email", old_email_val)
        .execute()
    )
    if not update_res.data:
        raise HTTPException(status_code=404, detail="Admin record not found to update.")

    # 2. Update in Supabase Auth (auth.users)
    try:
        users = db.auth.admin.list_users()
        auth_user_id = None
        for u in users:
            if u.email and u.email.lower().strip() == old_email_val:
                auth_user_id = u.id
                break

        if auth_user_id:
            db.auth.admin.update_user_by_id(
                auth_user_id,
                {"email": new_email_val, "email_confirm": True}
            )
            logger.info("Updated Supabase Auth email from %s to %s", old_email_val, new_email_val)
    except Exception as e:
        logger.warning("Failed to update email in Supabase Auth: %s", e)

    return {"ok": True, "email": new_email_val, "message": "Email updated successfully. Please use your new email for future logins."}


@router.post("/change-password")
async def change_my_password(
    payload: ChangePasswordPayload,
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Admin self-service: update own password."""
    new_pass = payload.new_password
    if not new_pass or len(new_pass) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    db = get_supabase()
    clean_email = admin.email.strip().lower()

    try:
        users = db.auth.admin.list_users()
        auth_user_id = None
        for u in users:
            if u.email and u.email.lower().strip() == clean_email:
                auth_user_id = u.id
                break

        if not auth_user_id:
            raise HTTPException(status_code=404, detail="User account not found in auth service.")

        db.auth.admin.update_user_by_id(
            auth_user_id,
            {"password": new_pass}
        )
        logger.info("Password updated successfully for admin %s", clean_email)
        return {"ok": True, "message": "Password changed successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update password in Supabase Auth: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to update password: {e}")

