"""
Email service abstraction.

Primary implementation uses Gmail SMTP (smtp.gmail.com:587 with STARTTLS).
To swap for another provider, implement EmailService — no other files need to change.

If GMAIL_APP_PASSWORD is empty or set to "log", emails are printed to stdout
instead of sent. This allows local development without real credentials.
"""
import logging
import smtplib
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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
# Gmail SMTP implementation
# ---------------------------------------------------------------------------

class GmailSMTPEmailService(EmailService):
    """Email service using Gmail SMTP (smtp.gmail.com:587 with STARTTLS)."""

    def send(self, *, to: str | list[str], subject: str, html: str) -> None:
        gmail_user = (cfg.GMAIL_USER or "").strip()
        gmail_app_password = (cfg.GMAIL_APP_PASSWORD or "").strip()

        if not gmail_user or not gmail_app_password or gmail_app_password.lower() == "log":
            logger.error("GMAIL_USER or GMAIL_APP_PASSWORD is not configured. Cannot send email.")
            raise RuntimeError("Gmail SMTP credentials (GMAIL_USER / GMAIL_APP_PASSWORD) are not configured on the server.")

        recipients = to if isinstance(to, list) else [to]
        clean_recipients = [r.strip() for r in recipients if r and r.strip()]
        if not clean_recipients:
            logger.warning("No valid email recipients provided")
            return

        from_addr = (cfg.EMAIL_FROM or "").strip() or f"Narkadhai <{gmail_user}>"

        # Construct MIME message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = ", ".join(clean_recipients)
        msg.attach(MIMEText(html, "html", "utf-8"))

        smtp_host = (cfg.SMTP_HOST or "smtp.gmail.com").strip()
        smtp_port = int(cfg.SMTP_PORT or 587)
        use_tls = bool(cfg.SMTP_TLS)

        logger.info(
            "Attempting to send email via Gmail SMTP | Host: %s:%d | From: '%s' | To: %s | Subject: %s",
            smtp_host, smtp_port, from_addr, clean_recipients, subject,
        )

        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                if use_tls:
                    server.starttls()
                server.login(gmail_user, gmail_app_password)
                server.sendmail(from_addr, clean_recipients, msg.as_string())

            logger.info(
                "Gmail SMTP email sent successfully | To: %s | From: %s | Subject: %s",
                clean_recipients, from_addr, subject,
            )
        except Exception as err:
            logger.error(
                "Gmail SMTP email send failed | Host: %s:%d | From: '%s' | To: %s | Error: %s (%s)",
                smtp_host, smtp_port, from_addr, clean_recipients, err, type(err).__name__,
                exc_info=True,
            )
            raise RuntimeError(f"Failed to send email via Gmail SMTP: {err}") from err


# Backward compatibility alias
ResendEmailService = GmailSMTPEmailService


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
    gmail_user = (cfg.GMAIL_USER or "").strip()
    gmail_pass = (cfg.GMAIL_APP_PASSWORD or "").strip()
    if not gmail_pass or gmail_pass.lower() == "log" or not gmail_user:
        logger.debug("Using LogEmailService (GMAIL credentials unset or set to 'log')")
        return LogEmailService()
    return GmailSMTPEmailService()


# ---------------------------------------------------------------------------
# Pre-built email helpers
# ---------------------------------------------------------------------------

def send_donor_thankyou(
    *, donation_id: str, donor_name: str, donor_email: str, amount: float
) -> bool:
    """Send thank-you email to donor with their name and amount in INR via Gmail SMTP."""
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
    """Send notification to support.narkadhai@gmail.com / admins via Gmail SMTP."""
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
    """Send contact message notification to support.narkadhai@gmail.com / admins via Gmail SMTP."""
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
