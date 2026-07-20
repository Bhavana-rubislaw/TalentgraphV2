"""
Login attempt tracking: progressive delay + account lockout.

Brute-force protection layered on top of per-IP rate limiting (slowapi).
State lives on the User row (failed_login_attempts / locked_until /
last_failed_login_at) - there's no Redis in this project, and DB-backed
state survives process restarts, unlike an in-memory cache would.

Nothing here ever returns lockout-specific wording; callers should always
surface app.auth_constants.LOGIN_FAIL_MSG regardless of which check failed,
so a locked account is indistinguishable from a wrong password.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import Session

from app.models import User

logger = logging.getLogger(__name__)

LOCKOUT_THRESHOLD = 5
LOCKOUT_DURATION = timedelta(minutes=15)

# Wait required before attempt N is accepted, keyed by failed_login_attempts
# going into that attempt (attempt 1 = no prior failures = no delay).
PROGRESSIVE_DELAY_SECONDS = {0: 0, 1: 2, 2: 5, 3: 10, 4: 10}


def _now() -> datetime:
    # Naive UTC, matching User.created_at/updated_at and the "timestamp
    # without time zone" column type - an aware datetime here would get
    # silently shifted through Postgres's session timezone on write/read.
    return datetime.utcnow()


def is_blocked(user: User) -> bool:
    """True if the account is locked out or still inside its progressive delay window."""
    if user.locked_until and user.locked_until > _now():
        return True

    if user.last_failed_login_at is None:
        return False

    required_wait = PROGRESSIVE_DELAY_SECONDS.get(
        min(user.failed_login_attempts, LOCKOUT_THRESHOLD - 1), 0
    )
    if required_wait == 0:
        return False

    return _now() < user.last_failed_login_at + timedelta(seconds=required_wait)


def register_failure(session: Session, user: User) -> None:
    """Record a failed login attempt; lock the account once the threshold is hit."""
    user.failed_login_attempts += 1
    user.last_failed_login_at = _now()

    just_locked = False
    if user.failed_login_attempts >= LOCKOUT_THRESHOLD:
        user.locked_until = _now() + LOCKOUT_DURATION
        just_locked = True

    session.add(user)
    session.commit()

    if just_locked:
        _send_lockout_notification(user.email)


def reset_attempts(session: Session, user: User) -> None:
    """Clear lockout state after a successful login."""
    if user.failed_login_attempts == 0 and user.locked_until is None:
        return
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_failed_login_at = None
    session.add(user)
    session.commit()


def _send_lockout_notification(to_email: str) -> None:
    try:
        from app.services.email_service import EmailService

        EmailService().send_account_locked_email(to_email)
    except Exception as e:
        # Never let a notification failure break the auth response
        logger.error(f"[LOGIN_ATTEMPTS] Failed to send lockout notification: {e}")
