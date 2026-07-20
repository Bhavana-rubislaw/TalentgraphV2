"""
Confirms X-Request-Id flows end-to-end: RequestIdMiddleware -> meetings router
-> meeting service call kwargs, for both authenticated and tokenized endpoints.
"""

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_session
from app.middleware.request_id import RequestIdMiddleware
from app.routers import meetings
from app.schemas import MeetingRead, MeetingStatus, MeetingType
from app.security import get_current_user
from app.services.meeting_cancel_service import MeetingCancelService
from app.services.meeting_token_action_service import MeetingTokenActionService


def _build_client():
    app = FastAPI()
    app.include_router(meetings.router)
    app.add_middleware(RequestIdMiddleware)

    class DummySession:
        pass

    dummy_session = DummySession()

    def override_user():
        return {"email": "recruiter@example.com", "user_id": 99, "role": "RECRUITER"}

    def override_session():
        yield dummy_session

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_session] = override_session
    return TestClient(app), dummy_session


def _meeting_read() -> MeetingRead:
    now = datetime.now(timezone.utc)
    return MeetingRead(
        id=555,
        title="Interview",
        description="Cancelled",
        meeting_type=MeetingType.INTERVIEW,
        status=MeetingStatus.CANCELLED,
        scheduled_start=now,
        scheduled_end=now,
        duration_minutes=60,
        timezone="UTC",
        organizer_user_id=99,
        job_posting_id=None,
        match_id=None,
        application_id=None,
        location=None,
        video_meeting_url=None,
        video_provider=None,
        google_calendar_event_id=None,
        microsoft_calendar_event_id=None,
        cancelled_at=None,
        cancelled_by_user_id=None,
        cancellation_reason=None,
        reschedule_requested_at=None,
        reschedule_requested_by_user_id=None,
        reschedule_request_reason=None,
        reschedule_request_preferred_times=None,
        created_at=now,
        updated_at=now,
        participants=[],
    )


def test_cancel_meeting_propagates_incoming_request_id(monkeypatch):
    client, _ = _build_client()
    calls = []

    def fake_cancel_meeting(*, meeting_id, cancel_data, current_user, session, request_id=None):
        calls.append(request_id)
        return _meeting_read()

    monkeypatch.setattr(
        MeetingCancelService, "cancel_meeting", staticmethod(fake_cancel_meeting)
    )

    response = client.post(
        "/meetings/555/cancel",
        json={"cancellation_reason": "conflict"},
        headers={"X-Request-Id": "req-cancel-known"},
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "req-cancel-known"
    assert calls == ["req-cancel-known"]


def test_cancel_meeting_mints_request_id_when_absent(monkeypatch):
    client, _ = _build_client()
    calls = []

    def fake_cancel_meeting(*, meeting_id, cancel_data, current_user, session, request_id=None):
        calls.append(request_id)
        return _meeting_read()

    monkeypatch.setattr(
        MeetingCancelService, "cancel_meeting", staticmethod(fake_cancel_meeting)
    )

    response = client.post("/meetings/555/cancel", json={"cancellation_reason": "conflict"})

    assert response.status_code == 200
    minted_id = response.headers["x-request-id"]
    assert minted_id
    assert calls == [minted_id]


def test_confirm_via_token_propagates_request_id(monkeypatch):
    client, _ = _build_client()
    calls = []

    def fake_confirm(*, token, session, request_id=None):
        calls.append(request_id)
        return {"message": "ok", "meeting_id": 1, "redirect_url": "/meetings/1"}

    monkeypatch.setattr(
        MeetingTokenActionService,
        "confirm_meeting_via_token",
        staticmethod(fake_confirm),
    )

    response = client.get(
        "/meetings/token/tok123/confirm",
        headers={"X-Request-Id": "req-token-confirm"},
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "req-token-confirm"
    assert calls == ["req-token-confirm"]
