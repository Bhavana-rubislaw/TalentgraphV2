"""
Audit / Activity Event logging service.

log_activity_event() is the single entry-point used by every mutating
endpoint.  It must be called BEFORE session.commit() so that the audit
row is written in the same transaction as the operational change.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlmodel import Session

from app.models import ActivityEvent, User

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Public helper                                                                #
# --------------------------------------------------------------------------- #

def log_activity_event(
    session: Session,
    *,
    entity_type: str,
    entity_id: Any,
    action: str,
    performed_by_user: User,
    before_value: Optional[Dict] = None,
    after_value: Optional[Dict] = None,
    request_id: Optional[str] = None,
    source: str = "web",
    dedupe_key: Optional[str] = None,
) -> ActivityEvent:
    """
    Append an immutable ActivityEvent row to the session (does NOT commit).

    The caller is responsible for committing; this keeps the write within
    the same transaction as the operational change.

    Parameters
    ----------
    session        : open SQLModel session (same one used for the op write)
    entity_type    : 'application' | 'swipe' | 'notification' | 'match' |
                     'job_posting' | 'profile' | 'company'
    entity_id      : id of the affected operational row (any type → str)
    action         : verb describing the change (see below)
    performed_by_user : User ORM object of the actor
    before_value   : dict snapshot BEFORE mutation (safe subset)
    after_value    : dict snapshot AFTER  mutation (safe subset)
    request_id     : from request.state.request_id (None OK if not available)
    source         : 'web' | 'ios' | 'android'
    dedupe_key     : optional unique string to prevent duplicate events
                     (e.g. f"swipe:candidate:{cand_id}:posting:{posting_id}")
    """
    # If a dedupe_key is set, silently skip duplicate events
    if dedupe_key:
        from sqlmodel import select
        existing = session.exec(
            select(ActivityEvent).where(ActivityEvent.dedupe_key == dedupe_key)
        ).first()
        if existing:
            logger.debug(
                "[AUDIT] skipped duplicate event dedupe_key=%s", dedupe_key
            )
            return existing

    event = ActivityEvent(
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        before_value=_to_json(before_value),
        after_value=_to_json(after_value),
        performed_by_user_id=performed_by_user.id,
        performed_by_role=performed_by_user.role.value
            if hasattr(performed_by_user.role, "value")
            else str(performed_by_user.role),
        created_at=datetime.utcnow(),
        request_id=request_id,
        source=source,
        dedupe_key=dedupe_key,
    )
    session.add(event)
    logger.info(
        "[AUDIT] entity=%s id=%s action=%s actor=%s request_id=%s",
        entity_type,
        entity_id,
        action,
        performed_by_user.id,
        request_id,
    )
    return event


# --------------------------------------------------------------------------- #
# Snapshot helpers – produce safe serialisable dicts from ORM objects         #
# --------------------------------------------------------------------------- #

def snap_application(app) -> Dict:
    return {
        "id": app.id,
        "candidate_id": app.candidate_id,
        "job_posting_id": app.job_posting_id,
        "job_profile_id": app.job_profile_id,
        "status": app.status,
        "applied_at": _ts(app.applied_at),
    }


def snap_swipe(sw) -> Dict:
    return {
        "id": sw.id,
        "candidate_id": sw.candidate_id,
        "company_id": sw.company_id,
        "job_profile_id": sw.job_profile_id,
        "job_posting_id": sw.job_posting_id,
        "action": sw.action,
        "action_by": sw.action_by,
        "created_at": _ts(sw.created_at),
    }


def snap_notification(n) -> Dict:
    return {
        "id": n.id,
        "user_id": n.user_id,
        "title": n.title,
        "event_type": n.event_type,
        "is_read": n.is_read,
        "created_at": _ts(n.created_at),
    }


def snap_job_posting(jp) -> Dict:
    return {
        "id": jp.id,
        "company_id": jp.company_id,
        "job_title": jp.job_title,
        "is_active": jp.is_active,
        "updated_at": _ts(getattr(jp, "updated_at", None)),
    }


def snap_job_profile(p) -> Dict:
    return {
        "id": p.id,
        "candidate_id": p.candidate_id,
        "profile_name": p.profile_name,
        "job_role": p.job_role,
        "updated_at": _ts(getattr(p, "updated_at", None)),
    }


# --------------------------------------------------------------------------- #
# Private utils                                                                #
# --------------------------------------------------------------------------- #

def _to_json(d: Optional[Dict]) -> Optional[str]:
    if d is None:
        return None
    try:
        return json.dumps(d, default=str)
    except (TypeError, ValueError):
        return None


def _ts(dt) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    return str(dt)
