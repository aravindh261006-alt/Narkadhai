"""
Auth service — verifies Supabase JWTs and checks the authorized_admins allow-list.

The check is two-layer:
1. Verify the JWT signature using SUPABASE_JWT_SECRET (Supabase HS256)
2. Query the authorized_admins table (via service-role client) to confirm
   the email is on the allow-list and get the role.

If either check fails, the request is rejected with 403.
"""
import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings as cfg
from app.db import get_supabase

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


class AdminUser:
    def __init__(self, email: str, name: str, role: str):
        self.email = email
        self.name = name
        self.role = role

    @property
    def is_owner(self) -> bool:
        return self.role == "owner"

    @property
    def is_audit_or_owner(self) -> bool:
        return self.role in ("owner", "audit")


def _decode_token(token: str) -> dict:
    """Decode and verify a Supabase JWT."""
    # 1. Attempt local verification if JWT secret is available
    if cfg.SUPABASE_JWT_SECRET and cfg.SUPABASE_JWT_SECRET not in ("your-jwt-secret-here", ""):
        try:
            payload = jwt.decode(
                token,
                cfg.SUPABASE_JWT_SECRET.strip(),
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return payload
        except JWTError as e:
            logger.warning("Local JWT decode failed (%s). Attempting verification via Supabase Auth API...", e)

    # 2. Fallback: Verify token directly against Supabase Auth service
    try:
        db = get_supabase()
        user_resp = db.auth.get_user(token)
        if user_resp and user_resp.user:
            user = user_resp.user
            return {
                "sub": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata or {},
                "app_metadata": user.app_metadata or {},
            }
    except Exception as e:
        logger.error("Supabase auth.get_user verification failed: %s", e)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token. Please log in again.",
    )


def _get_admin_record(email: str) -> dict | None:
    """Check authorized_admins table using service role client (case-insensitive)."""
    try:
        db = get_supabase()
        clean_email = email.strip().lower()
        resp = (
            db.table("authorized_admins")
            .select("email, name, role")
            .ilike("email", clean_email)
            .execute()
        )
        if resp.data and len(resp.data) > 0:
            return resp.data[0]
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to query authorized_admins table for %s: %s", email, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error verifying admin authorization: {str(e)}",
        )


async def get_current_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AdminUser:
    """FastAPI dependency: validates token + authorized_admins membership."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No token provided")

    payload = _decode_token(credentials.credentials)
    email = payload.get("email") or (payload.get("user_metadata") or {}).get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has no email claim")

    record = _get_admin_record(email)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied - You are not authorized to access this area",
        )

    return AdminUser(email=record["email"], name=record["name"], role=record["role"])


async def require_owner(
    admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> AdminUser:
    """Dependency that requires the 'owner' role."""
    if not admin.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires the 'owner' role.",
        )
    return admin


async def require_audit_or_owner(
    admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> AdminUser:
    """Dependency that requires 'audit' or 'owner' role."""
    if not admin.is_audit_or_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires admin access.",
        )
    return admin
