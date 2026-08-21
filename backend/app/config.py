"""Application settings loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Resend (email)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Narkadhai <onboarding@resend.dev>"
    OWNER_EMAIL: str = ""         # notification recipient

    # CORS
    FRONTEND_URL: str = "https://narkadhai.vercel.app,http://localhost:5173"

    # Environment
    ENVIRONMENT: str = "development"


settings = Settings()
