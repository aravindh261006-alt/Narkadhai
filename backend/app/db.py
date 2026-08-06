"""
Supabase database client — uses the SERVICE ROLE key server-side.
This module must NEVER be imported by any frontend code.
"""
from supabase import create_client, Client
from app.config import settings as cfg

_client: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase client using the service role key."""
    global _client
    if _client is None:
        _client = create_client(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY)
    return _client
