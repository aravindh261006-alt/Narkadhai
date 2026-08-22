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
    """Owner only: add an authorized admin and trigger invite email."""
    email_val = payload.get("email", "").strip().lower()
    role_val = payload.get("role", "audit").strip().lower()

    if not email_val or not re.match(r"[^@]+@[^@]+\.[^@]+", email_val):
        raise HTTPException(status_code=400, detail="Invalid email address.")

    if role_val not in ("owner", "audit"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'owner' or 'audit'.")

    if email_val == "support.narkadhai@gmail.com" and role_val != "owner":
        raise HTTPException(status_code=400, detail="support.narkadhai@gmail.com must always keep the 'owner' role.")

    db = get_supabase()

    # Check if already exists in authorized_admins
    existing = db.table("authorized_admins").select("id").eq("email", email_val).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Admin email is already authorized.")

    name_val = email_val.split("@")[0]

    # Pre-emptively search and delete any existing auth user in auth.users by email to allow re-invite
    existing_auth_id = None
    try:
        users = db.auth.admin.list_users()
        for u in users:
            if u.email and u.email.lower().strip() == email_val:
                existing_auth_id = u.id
                break
    except Exception as e:
        logger.warning("Failed to list users to check existence: %s", e)

    if existing_auth_id:
        try:
            db.auth.admin.delete_user(existing_auth_id)
            logger.info("Deleted existing auth user record for %s to clear way for re-invite", email_val)
        except Exception as e:
            logger.error("Failed to delete existing auth user %s: %s", email_val, e)

    # 1. Insert into authorized_admins table
    resp = db.table("authorized_admins").insert({
        "email": email_val,
        "name": name_val,
        "role": role_val,
    }).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to authorize admin in database.")

    # 2. Call generate_link to generate the Supabase invitation link
    invite_link = None
    try:
        frontend_base = cfg.FRONTEND_URL.split(",")[0].strip().rstrip("/")
        redirect_url = f"{frontend_base}/reset-password"
        link_res = db.auth.admin.generate_link({
            "type": "invite",
            "email": email_val,
            "options": {"redirect_to": redirect_url}
        })
        invite_link = link_res.properties.action_link
    except Exception as e:
        logger.error("Failed to generate invite link for %s: %s", email_val, e)
        # Rollback db insertion to keep consistency
        db.table("authorized_admins").delete().eq("email", email_val).execute()
        raise HTTPException(status_code=500, detail=f"Failed to generate Supabase invite: {e}")

    # 3. Send email via email service
    if invite_link:
        email_svc = email.get_email_service()
        subject = "Invitation to join Narkadhai Admin"
        html_body = f"""
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background-color:#FAF7F2;">
          <h2 style="color:#1A4D3A;text-align:center;font-family:Georgia,serif;margin-bottom:20px;">Welcome to Narkadhai</h2>
          <p style="font-size:15px;color:#0D1F17;line-height:1.6;">You have been invited to join the Narkadhai admin area with the role of <strong>{role_val}</strong>.</p>
          <p style="font-size:15px;color:#0D1F17;line-height:1.6;">Please click the button below to set your password and access the admin dashboard:</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="{invite_link}" style="background-color:#1A4D3A;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 6px rgba(26,77,58,0.15);">Set Password & Accept Invite</a>
          </div>
          <p style="color:#666;font-size:12px;margin-top:24px;">If the button above does not work, copy and paste this URL into your browser:</p>
          <p style="color:#1A7D47;font-size:12px;word-break:break-all;"><a href="{invite_link}" style="color:#1A7D47;">{invite_link}</a></p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;">
          <p style="color:#888;font-size:11px;text-align:center;">This is a secure transactional email from Narkadhai. Link will expire in 24 hours.</p>
        </div>
        """
        try:
            email_svc.send(to=email_val, subject=subject, html=html_body)
        except Exception as e:
            logger.error("Failed to send invite email to %s: %s", email_val, e)
            return {
                "id": resp.data[0]["id"],
                "email": resp.data[0]["email"],
                "name": resp.data[0]["name"],
                "role": resp.data[0]["role"],
                "warning": "Admin authorized but invitation email could not be sent. Link: " + invite_link
            }

    return resp.data[0]


@router.delete("/admins/{admin_id}")
async def remove_admin(
    admin_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: remove an admin. Cannot remove support.narkadhai@gmail.com or yourself."""
    db = get_supabase()
    record = db.table("authorized_admins").select("email").eq("id", admin_id).single().execute()
    if not record.data:
        raise HTTPException(status_code=404, detail="Admin not found")

    email_val = record.data["email"].lower().strip()

    if email_val == "support.narkadhai@gmail.com":
        raise HTTPException(status_code=400, detail="The owner support.narkadhai@gmail.com cannot be removed.")

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

