"""
Notification helper utilities for TalentGraph V2.
Creates Notification records to be added to the session by the caller.
"""

from app.models import Notification


def create_notification(
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    job_posting_id: int = None,
    job_title: str = None,
    candidate_id: int = None,
    candidate_name: str = None,
    job_profile_id: int = None,
    job_profile_name: str = None,
) -> Notification:
    """Build a Notification object (caller must add + commit via session)."""
    return Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        job_posting_id=job_posting_id,
        job_title=job_title,
        candidate_id=candidate_id,
        candidate_name=candidate_name,
        job_profile_id=job_profile_id,
        job_profile_name=job_profile_name,
    )
