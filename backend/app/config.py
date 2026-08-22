"""Application settings loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Gmail SMTP (email)
    GMAIL_USER: str = "support.narkadhai@gmail.com"
    GMAIL_APP_PASSWORD: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    EMAIL_FROM: str = "Narkadhai <support.narkadhai@gmail.com>"
    OWNER_EMAIL: str = "support.narkadhai@gmail.com"         # notification recipient

    # Legacy Resend support (optional fallback)
    RESEND_API_KEY: str = ""

    # CORS
    FRONTEND_URL: str = "https://narkadhai.vercel.app,http://localhost:5173"

    # Environment
    ENVIRONMENT: str = "development"


settings = Settings()
