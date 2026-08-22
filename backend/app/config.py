"""Application settings loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Gmail API (OAuth2 over HTTPS 443)
    GMAIL_USER: str = "support.narkadhai@gmail.com"
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REFRESH_TOKEN: str = ""
    EMAIL_FROM: str = "Narkadhai <support.narkadhai@gmail.com>"
    EMAIL_REPLY_TO: str = "support.narkadhai@gmail.com"
    OWNER_EMAIL: str = "support.narkadhai@gmail.com"         # notification recipient

    # CORS
    FRONTEND_URL: str = "https://narkadhai.vercel.app,http://localhost:5173"

    # Environment
    ENVIRONMENT: str = "development"


settings = Settings()
