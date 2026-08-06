"""
Email service abstraction.

Default implementation uses Resend (https://resend.com).
To swap for SMTP or SendGrid, replace ResendEmailService with a new class
that implements the same interface — no other files need to change.

If RESEND_API_KEY is empty or set to "log", emails are printed to stdout
instead of sent. This allows local development without a real API key.
"""
import logging
from abc import ABC, abstractmethod

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
# Resend implementation
# ---------------------------------------------------------------------------

class ResendEmailService(EmailService):
    def send(self, *, to: str | list[str], subject: str, html: str) -> None:
        import resend
        resend.api_key = cfg.RESEND_API_KEY
        params = resend.Emails.SendParams(
            from_=cfg.EMAIL_FROM,
            to=to if isinstance(to, list) else [to],
            subject=subject,
            html=html,
        )
        resend.Emails.send(params)


# ---------------------------------------------------------------------------
# Log-only implementation (dev / missing key)
# ---------------------------------------------------------------------------

class LogEmailService(EmailService):
    def send(self, *, to: str | list[str], subject: str, html: str) -> None:
        logger.info(
            "[EMAIL LOG] To: %s | Subject: %s | Body preview: %.200s",
            to, subject, html,
        )


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_email_service() -> EmailService:
    if not cfg.RESEND_API_KEY or cfg.RESEND_API_KEY == "log":
        return LogEmailService()
    return ResendEmailService()


# ---------------------------------------------------------------------------
# Pre-built email helpers
# ---------------------------------------------------------------------------

def send_donor_thankyou(
    *, donation_id: str, donor_name: str, donor_email: str, amount: float
) -> bool:
    """Send thank-you email to donor. Returns True on success, False on failure (never raises)."""
    svc = get_email_service()
    formatted_amount = _format_inr(amount)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#1A4D3A;">Thank you for your donation, {donor_name}!</h2>
      <p>We have received your self-reported donation of <strong>{formatted_amount}</strong>.</p>
      <p>Our team will verify it against our records shortly. Once verified, it will appear on our public donation tracker.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="color:#888;font-size:13px;">
        <strong>Important:</strong> Narkadhai is not a certified or registered nonprofit organization.
        Donations are voluntary contributions and are not eligible for tax exemption under any law.
        This is an acknowledgement of your self-reported contribution, not an official receipt.
      </p>
      <p style="color:#888;font-size:13px;">With gratitude,<br>The Narkadhai Team</p>
    </div>
    """
    try:
        svc.send(to=donor_email, subject="Thank you for your donation — Narkadhai", html=html)
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
    """Send notification to owner/auditors. Returns True on success, False on failure (never raises)."""
    svc = get_email_service()
    formatted_amount = _format_inr(amount)
    utr_line = f"<p><strong>UTR/Txn ID:</strong> {utr}</p>" if utr else ""
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#1A4D3A;">New Donation Reported</h2>
      <p><strong>Donor:</strong> {donor_name} ({donor_email})</p>
      <p><strong>Amount:</strong> {formatted_amount}</p>
      {utr_line}
      <p><strong>Donation ID:</strong> {donation_id}</p>
      <p>Please log in to the admin panel to verify this donation against your bank/UPI statement.</p>
    </div>
    """
    try:
        svc.send(to=owner_emails, subject=f"New donation reported — {formatted_amount}", html=html)
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
    svc = get_email_service()
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#1A4D3A;">New Contact Message</h2>
      <p><strong>From:</strong> {sender_name} ({sender_email})</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left:3px solid #1A4D3A;padding-left:16px;color:#333;">{message}</blockquote>
    </div>
    """
    try:
        svc.send(to=owner_emails, subject=f"New contact message from {sender_name}", html=html)
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
