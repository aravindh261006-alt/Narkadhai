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
    SMTP_PORT: int = 465
    SMTP_SSL: bool = True
    SMTP_TLS: bool = False
    EMAIL_FROM: str = "Narkadhai <support.narkadhai@gmail.com>"
    EMAIL_REPLY_TO: str = "support.narkadhai@gmail.com"
    OWNER_EMAIL: str = "support.narkadhai@gmail.com"         # notification recipient

    # Resend fallback (HTTPS port 443 — works on Render free tier without domain verification)
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "Narkadhai <onboarding@resend.dev>"

    # CORS
    FRONTEND_URL: str = "https://narkadhai.vercel.app,http://localhost:5173"

    # Environment
    ENVIRONMENT: str = "development"


settings = Settings()
