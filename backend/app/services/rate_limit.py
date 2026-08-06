"""
Rate limiter backed by the Supabase rate_limit_log table.
This is cold-start safe (no in-memory state).

Usage:
    from app.services.rate_limit import check_rate_limit
    check_rate_limit(ip=client_ip, endpoint="donate", limit=5, window_seconds=3600)
"""
import hashlib
import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status

from app.db import get_supabase

logger = logging.getLogger(__name__)

RATE_LIMITS = {
    "donate": {"limit": 5, "window_seconds": 3600},
    "contact": {"limit": 3, "window_seconds": 3600},
}


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


def check_rate_limit(*, ip: str, endpoint: str) -> None:
    """
    Raises HTTP 429 if the IP has exceeded the rate limit for the endpoint.
    Also prunes old entries to keep the table small.
    """
    rule = RATE_LIMITS.get(endpoint)
    if not rule:
        return  # No rule = no limiting

    ip_hash = _hash_ip(ip)
    window = timedelta(seconds=rule["window_seconds"])
    cutoff = (datetime.now(timezone.utc) - window).isoformat()
    db = get_supabase()

    try:
        # Count recent requests from this IP+endpoint
        resp = (
            db.table("rate_limit_log")
            .select("id", count="exact")
            .eq("ip_hash", ip_hash)
            .eq("endpoint", endpoint)
            .gte("created_at", cutoff)
            .execute()
        )
        count = resp.count or 0
        if count >= rule["limit"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait before submitting again.",
            )

        # Record this request
        db.table("rate_limit_log").insert(
            {"ip_hash": ip_hash, "endpoint": endpoint}
        ).execute()

        # Prune entries older than window (fire-and-forget; ignore errors)
        try:
            db.table("rate_limit_log").delete().lt("created_at", cutoff).execute()
        except Exception:
            pass

    except HTTPException:
        raise
    except Exception as e:
        # If rate limiting itself fails, log and allow the request through
        logger.warning("Rate limit check failed (allowing request): %s", e)


def get_client_ip(request: Request) -> str:
    """Extract the real client IP, respecting Vercel/proxy forwarding headers."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
