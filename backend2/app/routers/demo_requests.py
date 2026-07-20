"""
Public "Request a Demo" endpoint for the marketing landing page.

Follows the same anti-enumeration policy as /auth/signup (see
app.auth_constants): this endpoint is public and unauthenticated, so the
HTTP response is identical regardless of whether the submitted email
already has a TalentGraph account. That keeps the public form from being
usable to probe which emails are registered. Behind the scenes:

- Email already registered: we send that inbox a note that an account
  already exists, rather than paging the team about a "new lead" that
  isn't one.
- Email not registered: we send the requester a confirmation and notify
  the TalentGraph team so they can follow up.
"""
import os

from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select

from app.core.logging_config import get_logger
from app.core.seed_credentials import DEFAULT_SEED_ADMIN_EMAIL
from app.database import get_session
from app.middleware.rate_limiting import RATE_LIMITS, limiter
from app.models import User
from app.schemas import DemoRequestCreate
from app.services.email_service import EmailService

logger = get_logger(__name__)
router = APIRouter(prefix="/demo-requests", tags=["Marketing"])

# Falls back to the same address used for the seeded system admin account
# unless a distinct inbox is configured for demo-request notifications.
ADMIN_NOTIFY_EMAIL = os.getenv("DEMO_REQUEST_NOTIFY_EMAIL") or os.getenv(
    "SEED_ADMIN_EMAIL", DEFAULT_SEED_ADMIN_EMAIL
)

# Always the same response, whether or not the email is already registered.
_RESPONSE = {"ok": True, "message": "Thanks! We'll be in touch within one business day."}

_ROLE_LABELS = {"recruiter": "Recruiter", "hr": "HR Manager", "admin": "Admin", "candidate": "Candidate"}

_EMAIL_STYLE = """
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .details { background: white; padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { margin: 8px 0; }
    .detail-label { font-weight: 600; color: #64748b; }
    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { color: #64748b; font-size: 13px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
"""


def _wrap(title: str, body_html: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head><style>{_EMAIL_STYLE}</style></head>
    <body>
        <div class="container">
            <div class="header"><h2 style="margin:0;">{title}</h2></div>
            <div class="content">{body_html}</div>
        </div>
    </body>
    </html>
    """


def _already_registered_email(full_name: str) -> tuple[str, str, str]:
    subject = "You already have a TalentGraph account"
    html = _wrap(
        "You're already on TalentGraph",
        f"""
        <p>Hi {full_name},</p>
        <p>We received a demo request for this email address, but it's already registered
        with a TalentGraph account. You can sign in below to pick up right where you left off.</p>
        <p style="margin: 24px 0;"><a class="btn" href="https://app.talentgraph.io/signin">Sign in to TalentGraph</a></p>
        <p>If this wasn't you, you can safely ignore this email.</p>
        """,
    )
    text = (
        f"Hi {full_name},\n\n"
        "We received a demo request for this email address, but it's already registered "
        "with a TalentGraph account. Sign in at https://app.talentgraph.io/signin to pick up "
        "where you left off.\n\nIf this wasn't you, you can safely ignore this email."
    )
    return subject, html, text


def _requester_confirmation_email(full_name: str, company: str) -> tuple[str, str, str]:
    subject = "We received your TalentGraph demo request"
    html = _wrap(
        "Thanks for your interest in TalentGraph",
        f"""
        <p>Hi {full_name},</p>
        <p>Thanks for requesting a walkthrough and demo of TalentGraph for <strong>{company}</strong>.
        Our team will reach out shortly to find a time that works for you.</p>
        """,
    )
    text = (
        f"Hi {full_name},\n\n"
        f"Thanks for requesting a walkthrough and demo of TalentGraph for {company}. "
        "Our team will reach out shortly to find a time that works for you."
    )
    return subject, html, text


def _admin_notification_email(data: DemoRequestCreate, email_lower: str) -> tuple[str, str, str]:
    subject = f"New demo request: {data.company} ({data.full_name})"
    html = _wrap(
        "New demo request",
        f"""
        <p>A request for a walkthrough and demo has come in from the landing page.</p>
        <div class="details">
            <div class="detail-row"><span class="detail-label">Name:</span> {data.full_name}</div>
            <div class="detail-row"><span class="detail-label">Work email:</span> {email_lower}</div>
            <div class="detail-row"><span class="detail-label">Company:</span> {data.company}</div>
            <div class="detail-row"><span class="detail-label">Role:</span> {_ROLE_LABELS.get(data.role, data.role)}</div>
        </div>
        """,
    )
    text = (
        "A request for a walkthrough and demo has come in from the landing page.\n\n"
        f"Name: {data.full_name}\n"
        f"Work email: {email_lower}\n"
        f"Company: {data.company}\n"
        f"Role: {_ROLE_LABELS.get(data.role, data.role)}"
    )
    return subject, html, text


@router.post("", response_model=dict)
@limiter.limit(RATE_LIMITS["auth"])
def request_demo(request: Request, data: DemoRequestCreate, session: Session = Depends(get_session)):
    email_lower = data.work_email.lower()
    email_service = EmailService()

    existing_user = session.exec(select(User).where(User.email == email_lower)).first()

    if existing_user:
        logger.info("[DEMO REQUEST] Submitted with an already-registered email")
        subject, html, text = _already_registered_email(existing_user.full_name or data.full_name)
        try:
            email_service.send_email(to_email=email_lower, subject=subject, html_content=html, plain_content=text)
        except Exception as e:
            logger.error(f"[DEMO REQUEST] Failed to send already-registered notice: {e}")
        return _RESPONSE

    # New lead: confirm to the requester and notify the TalentGraph team.
    subject, html, text = _requester_confirmation_email(data.full_name, data.company)
    try:
        email_service.send_email(to_email=email_lower, subject=subject, html_content=html, plain_content=text)
    except Exception as e:
        logger.error(f"[DEMO REQUEST] Failed to send requester confirmation: {e}")

    subject, html, text = _admin_notification_email(data, email_lower)
    try:
        email_service.send_email(
            to_email=ADMIN_NOTIFY_EMAIL, subject=subject, html_content=html, plain_content=text, reply_to=email_lower
        )
    except Exception as e:
        logger.error(f"[DEMO REQUEST] Failed to notify admin: {e}")

    logger.info(f"[DEMO REQUEST] New demo request from {data.company}")
    return _RESPONSE
