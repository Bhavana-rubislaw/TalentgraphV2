"""
Email OTP issue/verify for signup verification and login 2FA.

Mirrors the care in the password flow:
- only an HMAC of the code is stored, never plaintext
- constant-time comparison
- codes are single-use, time-boxed (10 min), and capped at 5 attempts
- every failure mode (no record, expired, exhausted, wrong code) is
  indistinguishable to the caller
"""

import hmac
import hashlib
import secrets
from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.core.logging_config import get_logger
from app.models import EmailOTP, User
from app.security import JWT_SECRET

logger = get_logger(__name__)

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_DIGITS = 6

PURPOSE_SIGNUP = "signup"
PURPOSE_LOGIN = "login"


def _hash_code(code: str) -> str:
    # HMAC keyed with the server secret: fast enough for a 10-minute code,
    # and an offline DB leak alone is not enough to forge codes.
    return hmac.new(JWT_SECRET.encode(), code.encode(), hashlib.sha256).hexdigest()


def issue_otp(session: Session, user: User, purpose: str) -> str:
    """Create (or replace) the pending code for this user+purpose.

    Returns the plaintext code so the caller can email it. The plaintext
    is never stored.
    """
    for old in session.exec(
        select(EmailOTP).where(EmailOTP.user_id == user.id, EmailOTP.purpose == purpose)
    ).all():
        session.delete(old)

    code = "".join(secrets.choice("0123456789") for _ in range(OTP_DIGITS))
    session.add(EmailOTP(
        user_id=user.id,
        purpose=purpose,
        otp_hash=_hash_code(code),
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES),
    ))
    session.commit()
    logger.info(f"[OTP] Issued {purpose} code for user {user.id}")
    return code


def has_pending_otp(session: Session, user: User, purpose: str) -> bool:
    record = session.exec(
        select(EmailOTP).where(EmailOTP.user_id == user.id, EmailOTP.purpose == purpose)
    ).first()
    return record is not None and record.expires_at > datetime.utcnow()


def verify_otp(session: Session, user: User, purpose: str, code: str) -> bool:
    """Check a submitted code. True consumes the record; False for any
    failure (missing, expired, attempts exhausted, wrong code) with no
    distinction exposed."""
    record = session.exec(
        select(EmailOTP).where(EmailOTP.user_id == user.id, EmailOTP.purpose == purpose)
    ).first()

    if record is None:
        return False

    if record.expires_at <= datetime.utcnow():
        session.delete(record)
        session.commit()
        return False

    if record.attempt_count >= OTP_MAX_ATTEMPTS:
        session.delete(record)
        session.commit()
        logger.warning(f"[OTP] Attempt cap hit for user {user.id} ({purpose})")
        return False

    if not hmac.compare_digest(record.otp_hash, _hash_code(code)):
        record.attempt_count += 1
        session.add(record)
        session.commit()
        return False

    session.delete(record)
    session.commit()
    logger.info(f"[OTP] Verified {purpose} code for user {user.id}")
    return True


# ── Email content ────────────────────────────────────────────────────

def build_otp_email(code: str, purpose: str) -> tuple[str, str, str]:
    """Returns (subject, html_body, text_body) for the OTP email."""
    action = "verify your email address" if purpose == PURPOSE_SIGNUP else "finish signing in"
    subject = f"{code} is your TalentGraph verification code"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
        .code {{ font-size: 34px; font-weight: 700; letter-spacing: 8px; background: white;
                 padding: 16px 24px; border-radius: 8px; text-align: center; margin: 20px 0; }}
        .footer {{ color: #64748b; font-size: 13px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }}
    </style></head>
    <body>
        <div class="container">
            <div class="header"><h2 style="margin:0;">Your verification code</h2></div>
            <div class="content">
                <p>Use this code to {action}:</p>
                <div class="code">{code}</div>
                <p>This code expires in {OTP_TTL_MINUTES} minutes and can only be used once.</p>
                <div class="footer">
                    <p>If you didn't request this code, you can safely ignore this email —
                    someone may have typed your address by mistake.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    text = (
        f"Use this code to {action}: {code}\n\n"
        f"This code expires in {OTP_TTL_MINUTES} minutes and can only be used once.\n\n"
        "If you didn't request this code, you can safely ignore this email."
    )
    return subject, html, text
