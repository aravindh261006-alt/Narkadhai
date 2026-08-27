"""
Email service abstraction.

Primary implementation uses the Gmail REST API (v1) via OAuth2 (google-auth + google-api-python-client).
This operates over standard HTTPS (port 443) which works reliably across all cloud hosting providers including Render's free tier.

If GMAIL_REFRESH_TOKEN is empty or set to "log", emails are printed to stdout
instead of sent. This allows local development without real credentials.
"""
import base64
import logging
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.config import settings as cfg

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract interface
# ---------------------------------------------------------------------------

class EmailService(ABC):
    @abstractmethod
    def send(self, *, to: str | list[str], subject: str, html: str) -> None:
        """Send a transactional email."""


# ---------------------------------------------------------------------------
# Gmail API (OAuth2 over HTTPS port 443)
# ---------------------------------------------------------------------------

SCOPES = ['https://mail.google.com/']


class GmailAPIEmailService(EmailService):
    """Email service using Google's official Gmail REST API with OAuth2."""

    def send(self, *, to: str | list[str], subject: str, html: str) -> None:
        client_id = (cfg.GMAIL_CLIENT_ID or "").strip()
        client_secret = (cfg.GMAIL_CLIENT_SECRET or "").strip()
        refresh_token = (cfg.GMAIL_REFRESH_TOKEN or "").strip()
        user_email = (cfg.GMAIL_USER or "").strip() or "support.narkadhai@gmail.com"

        if not client_id or not client_secret or not refresh_token or refresh_token.lower() == "log":
            logger.error("Gmail OAuth2 credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) are not configured.")
            raise RuntimeError("Gmail OAuth2 credentials are not configured on the server.")

        recipients = to if isinstance(to, list) else [to]
        clean_recipients = [r.strip() for r in recipients if r and r.strip()]
        if not clean_recipients:
            logger.warning("No valid email recipients provided")
            return

        from_addr = (cfg.EMAIL_FROM or "").strip() or f"Narkadhai <{user_email}>"
        reply_to = (cfg.EMAIL_REPLY_TO or "").strip() or user_email

        # Construct MIME message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = ", ".join(clean_recipients)
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.attach(MIMEText(html, "html", "utf-8"))

        raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

        logger.info(
            "Attempting to send email via Gmail API (HTTPS 443) | From: '%s' | Reply-To: '%s' | To: %s | Subject: %s",
            from_addr, reply_to, clean_recipients, subject,
        )

        try:
            creds = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret,
                scopes=SCOPES,
            )

            if not creds.valid:
                creds.refresh(Request())

            service = build("gmail", "v1", credentials=creds, cache_discovery=False)
            res = (
                service.users()
                .messages()
                .send(userId="me", body={"raw": raw_message})
                .execute()
            )

            msg_id = res.get("id") if isinstance(res, dict) else getattr(res, "id", str(res))
            logger.info(
                "Gmail API email sent successfully | Msg ID: %s | To: %s | From: %s | Subject: %s",
                msg_id, clean_recipients, from_addr, subject,
            )
        except Exception as err:
            logger.error(
                "Gmail API email send failed | From: '%s' | To: %s | Error: %s (%s)",
                from_addr, clean_recipients, err, type(err).__name__,
                exc_info=True,
            )
            raise RuntimeError(f"Failed to send email via Gmail API: {err}") from err


# Backward compatibility aliases
GmailSMTPEmailService = GmailAPIEmailService
ResendEmailService = GmailAPIEmailService
HybridEmailService = GmailAPIEmailService


# ---------------------------------------------------------------------------
# Log-only implementation (dev / missing credentials)
# ---------------------------------------------------------------------------

class LogEmailService(EmailService):
    def send(self, *, to: str | list[str], subject: str, html: str) -> None:
        recipients = to if isinstance(to, list) else [to]
        logger.info(
            "[EMAIL LOG / DEV MODE] To: %s | Subject: %s | Body preview: %.200s",
            recipients, subject, html,
        )


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_email_service() -> EmailService:
    client_id = (cfg.GMAIL_CLIENT_ID or "").strip()
    client_secret = (cfg.GMAIL_CLIENT_SECRET or "").strip()
    refresh_token = (cfg.GMAIL_REFRESH_TOKEN or "").strip()

    if not client_id or not client_secret or not refresh_token or refresh_token.lower() == "log":
        logger.debug("Using LogEmailService (Gmail OAuth2 credentials unset or set to 'log')")
        return LogEmailService()

    return GmailAPIEmailService()


# ---------------------------------------------------------------------------
# Pre-built email helpers
# ---------------------------------------------------------------------------

def send_donor_thankyou(
    *, donation_id: str, donor_name: str, donor_email: str, amount: float
) -> bool:
    """Send thank-you email to donor with their name and amount in INR via Gmail API."""
    svc = get_email_service()
    formatted_amount = _format_inr(amount)
    html = f"""
    <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:600px;margin:auto;padding:32px;background:#FAF7F2;border-radius:16px;border:1px solid #e7e0d6;color:#1e293b;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#1A4D3A;margin:0 0 8px;font-size:26px;">Thank You, {donor_name}!</h1>
        <p style="color:#64748b;font-size:16px;margin:0;">We are deeply grateful for your generous contribution.</p>
      </div>

      <div style="background:#ffffff;padding:24px;border-radius:12px;border:1px solid #e2e8f0;margin:24px 0;text-align:center;">
        <p style="color:#64748b;font-size:14px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Donation Amount</p>
        <p style="color:#1A4D3A;font-size:32px;font-weight:bold;margin:0;">{formatted_amount}</p>
      </div>

      <p style="font-size:15px;line-height:1.6;color:#334155;">
        Your support enables us to continue visiting and directly supporting children's homes and old-age homes. Every contribution brings care, warmth, and smiles to those who need it most.
      </p>

      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:13px;">
        <p style="margin:0 0 4px;font-weight:600;color:#1A4D3A;">Narkadhai</p>
        <p style="margin:0;">Connecting hearts with homes · One step at a time</p>
      </div>
    </div>
    """
    try:
        svc.send(to=donor_email, subject=f"Thank you for your donation of {formatted_amount} — Narkadhai", html=html)
        logger.info("Thank-you email successfully sent to donor %s for %s", donor_email, formatted_amount)
        return True
    except Exception as e:
        logger.error(
            "Failed to send donor thank-you email (donation_id=%s, email=%s): %s",
            donation_id, donor_email, e,
        )
        return False


def send_owner_donation_notification(
    *,
    donation_id: str,
    owner_emails: list[str],
    donor_name: str,
    donor_email: str,
    amount: float,
    utr: str | None,
) -> bool:
    """Send notification to support.narkadhai@gmail.com / admins via Gmail API."""
    svc = get_email_service()
    formatted_amount = _format_inr(amount)
    utr_line = f"<p><strong>UTR / Txn ID:</strong> {utr}</p>" if utr else ""

    # Ensure support.narkadhai@gmail.com is always notified
    recipients = list(owner_emails) if owner_emails else []
    primary_email = "support.narkadhai@gmail.com"
    if primary_email not in [e.lower() for e in recipients]:
        recipients.append(primary_email)

    html = f"""
    <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;background:#FAF7F2;border-radius:16px;border:1px solid #e7e0d6;color:#1e293b;">
      <h2 style="color:#1A4D3A;margin-top:0;">New Donation Reported</h2>
      <div style="background:#ffffff;padding:20px;border-radius:12px;border:1px solid #e2e8f0;margin:16px 0;">
        <p style="margin:6px 0;"><strong>Donor Name:</strong> {donor_name}</p>
        <p style="margin:6px 0;"><strong>Donor Email:</strong> <a href="mailto:{donor_email}">{donor_email}</a></p>
        <p style="margin:6px 0;"><strong>Amount:</strong> <span style="color:#1A4D3A;font-weight:bold;font-size:18px;">{formatted_amount}</span></p>
        {utr_line}
        <p style="margin:6px 0;color:#64748b;font-size:12px;"><strong>Donation ID:</strong> {donation_id}</p>
      </div>
      <p style="font-size:14px;color:#475569;">Please log in to the Narkadhai admin dashboard to verify this donation.</p>
    </div>
    """
    try:
        svc.send(to=recipients, subject=f"New donation reported: {formatted_amount} by {donor_name}", html=html)
        logger.info("Donation notification sent to admins %s for donation %s", recipients, donation_id)
        return True
    except Exception as e:
        logger.error(
            "Failed to send owner donation notification (donation_id=%s): %s",
            donation_id, e,
        )
        return False


def send_contact_notification(
    *,
    owner_emails: list[str],
    sender_name: str,
    sender_email: str,
    message: str,
) -> None:
    """Send contact message notification to support.narkadhai@gmail.com / admins via Gmail API."""
    svc = get_email_service()
    recipients = list(owner_emails) if owner_emails else []
    primary_email = "support.narkadhai@gmail.com"
    if primary_email not in [e.lower() for e in recipients]:
        recipients.append(primary_email)

    html = f"""
    <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;background:#FAF7F2;border-radius:16px;border:1px solid #e7e0d6;color:#1e293b;">
      <h2 style="color:#1A4D3A;margin-top:0;">New Contact Message</h2>
      <div style="background:#ffffff;padding:20px;border-radius:12px;border:1px solid #e2e8f0;margin:16px 0;">
        <p style="margin:6px 0;"><strong>From:</strong> {sender_name} (<a href="mailto:{sender_email}">{sender_email}</a>)</p>
        <p style="margin:12px 0 4px;font-weight:600;">Message:</p>
        <blockquote style="border-left:3px solid #1A4D3A;padding-left:14px;margin:8px 0;color:#334155;white-space:pre-wrap;">{message}</blockquote>
      </div>
    </div>
    """
    try:
        svc.send(to=recipients, subject=f"New contact message from {sender_name}", html=html)
        logger.info("Contact notification sent to admins %s from %s", recipients, sender_email)
    except Exception as e:
        logger.error("Failed to send contact notification: %s", e)


def send_admin_welcome_email(
    *,
    admin_email: str,
    default_password: str = "Narkadhai@2024",
    role: str = "audit",
) -> bool:
    """Send welcome email to newly added admin with their login credentials."""
    svc = get_email_service()
    login_url = "https://narkadhai.vercel.app/admin"
    subject = "You have been added as an admin for Narkadhai"
    html = f"""
    <div style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;max-width:600px;margin:auto;padding:32px;background:#FAF7F2;border-radius:16px;border:1px solid #e7e0d6;color:#1e293b;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#1A4D3A;margin:0 0 8px;font-size:26px;">Welcome to Narkadhai Admin</h1>
        <p style="color:#334155;font-size:16px;margin:0;font-weight:500;">You have been added as an admin for Narkadhai.</p>
      </div>

      <div style="background:#ffffff;padding:24px;border-radius:12px;border:1px solid #e2e8f0;margin:24px 0;">
        <p style="margin:8px 0;font-size:15px;"><strong>Login at:</strong> <a href="{login_url}" style="color:#1A4D3A;font-weight:600;text-decoration:underline;">{login_url}</a></p>
        <p style="margin:8px 0;font-size:15px;"><strong>Email:</strong> {admin_email}</p>
        <p style="margin:8px 0;font-size:15px;"><strong>Default Password:</strong> <code style="background:#f1f5f9;padding:4px 8px;border-radius:6px;font-size:15px;color:#0f172a;font-weight:bold;">{default_password}</code></p>
        <p style="margin:8px 0;font-size:15px;"><strong>Role:</strong> {role.capitalize()}</p>
      </div>

      <div style="text-align:center;margin:28px 0;">
        <a href="{login_url}" style="background-color:#1A4D3A;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 6px rgba(26,77,58,0.15);">Login to Admin</a>
      </div>

      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;color:#92400e;font-size:14px;font-weight:600;">
          Please change your password after first login.
        </p>
        <p style="margin:6px 0 0;color:#78350f;font-size:13px;">
          You can change your password anytime by navigating to <strong>My Account</strong> (/admin/profile) in the admin panel.
        </p>
      </div>

      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:13px;">
        <p style="margin:0 0 4px;font-weight:600;color:#1A4D3A;">Narkadhai</p>
        <p style="margin:0;">Connecting hearts with homes · One step at a time</p>
      </div>
    </div>
    """
    try:
        svc.send(to=admin_email, subject=subject, html=html)
        logger.info("Admin welcome email successfully sent to %s", admin_email)
        return True
    except Exception as e:
        logger.error("Failed to send admin welcome email to %s: %s", admin_email, e)
        return False


def _format_inr(amount: float) -> str:
    """Format a number as Indian Rupee with Indian digit grouping."""
    s = str(int(amount))
    if len(s) <= 3:
        return f"₹{s}"
    last3 = s[-3:]
    rest = s[:-3]
    groups = []
    while len(rest) > 2:
        groups.insert(0, rest[-2:])
        rest = rest[:-2]
    if rest:
        groups.insert(0, rest)
    return f"₹{','.join(groups)},{last3}"

