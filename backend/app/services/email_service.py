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
    FALLBACK_FROM = "Narkadhai <onboarding@resend.dev>"

    def send(self, *, to: str | list[str], subject: str, html: str) -> None:
        import resend

        api_key = (cfg.RESEND_API_KEY or "").strip()
        if not api_key:
            logger.error("RESEND_API_KEY is not configured or is empty. Cannot send email.")
            raise RuntimeError("RESEND_API_KEY is not configured on the server.")

        resend.api_key = api_key
        recipients = to if isinstance(to, list) else [to]
        clean_recipients = [r.strip() for r in recipients if r and r.strip()]
        if not clean_recipients:
            logger.warning("No valid email recipients provided")
            return

        from_addr = (cfg.EMAIL_FROM or "").strip() or self.FALLBACK_FROM

        logger.info(
            "Attempting to send email via Resend | From: '%s' | To: %s | Subject: %s",
            from_addr, clean_recipients, subject,
        )

        try:
            params = resend.Emails.SendParams(
                from_=from_addr,
                to=clean_recipients,
                subject=subject,
                html=html,
            )
            res = resend.Emails.send(params)
            email_id = res.get("id") if isinstance(res, dict) else getattr(res, "id", str(res))
            logger.info(
                "Resend email sent successfully | Resend ID: %s | To: %s | From: %s",
                email_id, clean_recipients, from_addr,
            )
            return
        except Exception as primary_err:
            logger.error(
                "Resend email send failed | From: '%s' | To: %s | Error: %s (%s)",
                from_addr, clean_recipients, primary_err, type(primary_err).__name__,
                exc_info=True,
            )

            # If the primary sender was not the Resend sandbox address, attempt automatic fallback
            is_already_fallback = "onboarding@resend.dev" in from_addr.lower()
            if not is_already_fallback:
                logger.warning(
                    "Retrying Resend email with fallback sender '%s' due to failure with '%s'...",
                    self.FALLBACK_FROM, from_addr,
                )
                try:
                    fallback_params = resend.Emails.SendParams(
                        from_=self.FALLBACK_FROM,
                        to=clean_recipients,
                        subject=subject,
                        html=html,
                    )
                    fallback_res = resend.Emails.send(fallback_params)
                    fallback_id = (
                        fallback_res.get("id")
                        if isinstance(fallback_res, dict)
                        else getattr(fallback_res, "id", str(fallback_res))
                    )
                    logger.info(
                        "Resend fallback email sent successfully | Resend ID: %s | To: %s | From: %s",
                        fallback_id, clean_recipients, self.FALLBACK_FROM,
                    )
                    return
                except Exception as fallback_err:
                    logger.error(
                        "Resend fallback send also failed | From: '%s' | To: %s | Error: %s (%s)",
                        self.FALLBACK_FROM, clean_recipients, fallback_err, type(fallback_err).__name__,
                        exc_info=True,
                    )
                    raise RuntimeError(
                        f"Failed to send email via Resend. Primary attempt ('{from_addr}') failed: {primary_err}. "
                        f"Fallback attempt ('{self.FALLBACK_FROM}') failed: {fallback_err}. "
                        f"Note: On Resend free tier, verify your domain in Resend dashboard or ensure recipient matches account email."
                    ) from fallback_err

            # If it was already using fallback and still failed:
            raise RuntimeError(
                f"Failed to send email via Resend: {primary_err}. "
                f"Note: On Resend free tier with onboarding@resend.dev, emails can only be delivered to "
                f"the email address registered with your Resend account, or to domains verified in Resend."
            ) from primary_err


# ---------------------------------------------------------------------------
# Log-only implementation (dev / missing key)
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
    api_key = (cfg.RESEND_API_KEY or "").strip()
    if not api_key or api_key.lower() == "log":
        logger.debug("Using LogEmailService (RESEND_API_KEY is unset or 'log')")
        return LogEmailService()
    return ResendEmailService()


# ---------------------------------------------------------------------------
# Pre-built email helpers
# ---------------------------------------------------------------------------

def send_donor_thankyou(
    *, donation_id: str, donor_name: str, donor_email: str, amount: float
) -> bool:
    """Send thank-you email to donor with their name and amount in INR."""
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
    """Send notification to support.narkadhai@gmail.com / admins."""
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
