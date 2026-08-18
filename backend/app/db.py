"""
Supabase database client — uses the SERVICE ROLE key server-side.
This module must NEVER be imported by any frontend code.
"""
import logging
from fastapi import HTTPException
from supabase import create_client, Client
from app.config import settings as cfg

logger = logging.getLogger(__name__)
_client: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase client using the service role key."""
    global _client
    if _client is None:
        if not cfg.SUPABASE_URL or not cfg.SUPABASE_SERVICE_ROLE_KEY:
            logger.error("CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment variables!")
            raise HTTPException(
                status_code=500,
                detail="Backend configuration error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in Render environment variables.",
            )
        try:
            _client = create_client(cfg.SUPABASE_URL.strip(), cfg.SUPABASE_SERVICE_ROLE_KEY.strip())
        except Exception as e:
            logger.error("Failed to initialize Supabase client: %s", e, exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize Supabase client: {str(e)}",
            )
    return _client

