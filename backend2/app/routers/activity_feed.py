"""
Activity Feed API
GET /activity-feed  — returns paginated ActivityEvent rows for the authenticated user
                      scope-filtered by role (candidate sees their own events,
                      recruiter sees their company's events).

Query params
------------
category    : optional filter — applications | swipes | notifications |
                                 matches | profile | job_posting | system
page        : 1-indexed page number (default 1)
limit       : rows per page (default 20, max 100)
job_id      : recruiter-only filter events by a specific job posting entity_id
"""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, desc

from app.database import get_session
from app.models import ActivityEvent, Candidate, Company, User
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/activity-feed", tags=["Activity Feed"])


# ── Summary builder ──────────────────────────────────────────────────────────

_SUMMARIES: Dict[str, Dict[str, str]] = {
    "application": {
        "created":        "Application submitted",
        "status_changed": "Application status changed",
        "withdrawn":      "Application withdrawn",
    },
    "swipe": {
        "liked":          "Liked",
        "passed":         "Passed",
        "asked_to_apply": "Requested to apply",
        "invited":        "Invited to apply",
    },
    "notification": {
        "read":      "Notification read",
        "bulk_read": "All notifications marked as read",
        "deleted":   "Notification deleted",
    },
    "match": {
        "created": "New match created",
    },
    "job_posting": {
        "created": "Job posting published",
        "updated": "Job posting updated",
        "deleted": "Job posting removed",
    },
    "profile": {
        "created": "Profile created",
        "updated": "Profile updated",
    },
    "company": {
        "created": "Company profile created",
        "updated": "Company profile updated",
    },
}


def _build_summary(event: ActivityEvent) -> str:
    try:
        after = json.loads(event.after_value) if event.after_value else {}
        before = json.loads(event.before_value) if event.before_value else {}
    except Exception:
        after = {}
        before = {}

    base = (
        _SUMMARIES.get(event.entity_type, {}).get(event.action)
        or f"{event.entity_type}.{event.action}"
    )

    # Enrich for status changes
    if event.action == "status_changed":
        old_s = before.get("status", "")
        new_s = after.get("status", "")
        if old_s and new_s:
            return f"Application moved from {old_s.title()} to {new_s.title()}"

    if event.action == "bulk_read":
        count = after.get("count", 0)
        return f"{count} notification(s) marked as read"

    return base


def _serialize_event(event: ActivityEvent) -> Dict[str, Any]:
    def _parse(s):
        if not s:
            return None
        try:
            return json.loads(s)
        except Exception:
            return None

    return {
        "id": event.id,
        "entity_type": event.entity_type,
        "entity_id": event.entity_id,
        "action": event.action,
        "summary": _build_summary(event),
        "before_value": _parse(event.before_value),
        "after_value": _parse(event.after_value),
        "performed_by": {
            "user_id": event.performed_by_user_id,
            "role": event.performed_by_role,
        },
        "created_at": event.created_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "request_id": event.request_id,
        "source": event.source,
    }


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.get("", response_model=Dict[str, Any])
def get_activity_feed(
    category: Optional[str] = Query(
        None,
        description="Filter by entity_type: applications|swipes|notifications|matches|profile|job_posting",
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    job_id: Optional[int] = Query(None, description="Recruiter only: filter by job posting id"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = (user.role.value if hasattr(user.role, "value") else str(user.role)).lower()

    query = select(ActivityEvent)

    if role == "candidate":
        # Candidate sees only their own events
        query = query.where(ActivityEvent.performed_by_user_id == user.id)
    else:
        # Recruiter / hr / admin sees events performed by anyone in the same company
        company = session.exec(select(Company).where(Company.user_id == user.id)).first()
        if not company:
            raise HTTPException(status_code=403, detail="Company profile not found")

        # Collect all user_ids for the same company (all team members)
        team_users = session.exec(
            select(Company.user_id).where(Company.company_name == company.company_name)
        ).all()
        team_user_ids = list(team_users)
        query = query.where(ActivityEvent.performed_by_user_id.in_(team_user_ids))

        # Optional job filter: entity_id matches the job_posting id
        if job_id is not None:
            query = query.where(
                ActivityEvent.entity_type == "application",
                ActivityEvent.entity_id == str(job_id),
            )

    # Category mapping: frontend-friendly label → DB entity_type
    _category_map = {
        "applications": "application",
        "swipes": "swipe",
        "notifications": "notification",
        "matches": "match",
        "profile": "profile",
        "job_posting": "job_posting",
        "system": "system",
    }
    if category:
        mapped = _category_map.get(category, category)
        query = query.where(ActivityEvent.entity_type == mapped)

    # Total count (without pagination)
    all_rows = session.exec(query).all()
    total = len(all_rows)

    # Paginate
    query = (
        query.order_by(desc(ActivityEvent.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    events = session.exec(query).all()

    return {
        "items": [_serialize_event(e) for e in events],
        "page": page,
        "limit": limit,
        "total": total,
        "has_more": (page * limit) < total,
    }
