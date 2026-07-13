from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models import MeetingStatus
from app.services.application_router_workflow_service import ApplicationRouterWorkflowService
from app.services.meeting_cancel_service import MeetingCancelService
from app.services.meeting_reschedule_service import MeetingRescheduleService
from app.services.meeting_respond_reschedule_service import MeetingRespondRescheduleService
from app.services.meeting_update_service import MeetingUpdateService


class FakeSession:
    def __init__(self, meeting=None):
        self.meeting = meeting

    def get(self, model, entity_id):
        if getattr(model, "__name__", "") == "Meeting":
            return self.meeting
        return None


@pytest.fixture
def scheduled_meeting():
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=7,
        title="Interview",
        organizer_user_id=99,
        status=MeetingStatus.SCHEDULED,
        scheduled_start=now,
        scheduled_end=now + timedelta(hours=1),
        participants=[SimpleNamespace(user_id=99), SimpleNamespace(user_id=42)],
    )


def test_meeting_update_rejects_candidate_role(monkeypatch, scheduled_meeting):
    session = FakeSession(meeting=scheduled_meeting)
    monkeypatch.setattr(
        "app.services.meeting_update_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: SimpleNamespace(role="candidate"),
    )

    with pytest.raises(HTTPException) as exc:
        MeetingUpdateService.update_meeting(
            meeting_id=7,
            update_data=SimpleNamespace(scheduled_start=None, scheduled_end=None, participants=None, model_dump=lambda **kwargs: {}),
            current_user={"email": "cand@example.com", "user_id": 42},
            session=session,
        )

    assert exc.value.status_code == 403
    assert "Candidates cannot edit" in exc.value.detail


def test_meeting_cancel_rejects_candidate_role(monkeypatch, scheduled_meeting):
    session = FakeSession(meeting=scheduled_meeting)
    monkeypatch.setattr(
        "app.services.meeting_cancel_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: SimpleNamespace(role="candidate", full_name="Candidate", email=email),
    )

    with pytest.raises(HTTPException) as exc:
        MeetingCancelService.cancel_meeting(
            meeting_id=7,
            cancel_data=SimpleNamespace(canceller_name=None, canceller_email=None, cancellation_reason="n/a"),
            current_user={"email": "cand@example.com", "user_id": 42},
            session=session,
        )

    assert exc.value.status_code == 403
    assert "Candidates cannot cancel" in exc.value.detail


def test_meeting_reschedule_rejects_non_organizer(monkeypatch, scheduled_meeting):
    session = FakeSession(meeting=scheduled_meeting)

    with pytest.raises(HTTPException) as exc:
        MeetingRescheduleService.reschedule_meeting(
            meeting_id=7,
            reschedule_data=SimpleNamespace(
                scheduled_start=datetime.now(timezone.utc),
                scheduled_end=datetime.now(timezone.utc) + timedelta(hours=1),
                timezone="UTC",
                reason="conflict",
            ),
            current_user={"email": "cand@example.com", "user_id": 42},
            session=session,
        )

    assert exc.value.status_code == 403
    assert "Only organizer can reschedule" in exc.value.detail


def test_meeting_respond_rejects_non_organizer(monkeypatch):
    now = datetime.now(timezone.utc)
    meeting = SimpleNamespace(
        id=7,
        title="Interview",
        organizer_user_id=99,
        status=MeetingStatus.RESCHEDULE_REQUESTED,
        scheduled_start=now,
        scheduled_end=now + timedelta(hours=1),
        participants=[SimpleNamespace(user_id=99), SimpleNamespace(user_id=42)],
        reschedule_requested_by_user_id=42,
    )
    session = FakeSession(meeting=meeting)

    with pytest.raises(HTTPException) as exc:
        MeetingRespondRescheduleService.respond_to_reschedule_request(
            meeting_id=7,
            response_data=SimpleNamespace(approved=False, response_note="No", timezone=None),
            current_user={"email": "cand@example.com", "user_id": 42},
            session=session,
        )

    assert exc.value.status_code == 403
    assert "Only organizer can respond" in exc.value.detail


def test_application_status_review_rejects_non_recruiter_hr(monkeypatch):
    class AppSession:
        pass

    session = AppSession()
    user = SimpleNamespace(id=5, role="candidate")
    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: user,
    )

    with pytest.raises(HTTPException) as exc_status:
        ApplicationRouterWorkflowService.update_application_status(
            application_id=1,
            data=SimpleNamespace(status="scheduled"),
            request=SimpleNamespace(state=SimpleNamespace(request_id="rid-1")),
            current_user={"email": "cand@example.com", "user_id": 5},
            session=session,
        )

    with pytest.raises(HTTPException) as exc_review:
        ApplicationRouterWorkflowService.update_application_review(
            application_id=1,
            data=SimpleNamespace(status="scheduled", recruiter_notes=None),
            request=SimpleNamespace(state=SimpleNamespace(request_id="rid-2")),
            current_user={"email": "cand@example.com", "user_id": 5},
            session=session,
        )

    assert exc_status.value.status_code == 403
    assert exc_review.value.status_code == 403
