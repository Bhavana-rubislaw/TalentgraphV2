from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.database import get_session
from app.routers import meetings
from app.schemas import MeetingRead, MeetingStatus, MeetingType
from app.security import get_current_user
from app.services.meeting_update_service import MeetingUpdateService


def _build_client():
    app = FastAPI()
    app.include_router(meetings.router)

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
        id=321,
        title="Interview",
        description="Updated",
        meeting_type=MeetingType.INTERVIEW,
        status=MeetingStatus.SCHEDULED,
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


def test_update_meeting_delegates_to_service(monkeypatch):
    client, dummy_session = _build_client()
    calls = []

    def fake_update_meeting(*, meeting_id, update_data, current_user, session):
        calls.append(
            {
                "meeting_id": meeting_id,
                "update_data": update_data,
                "current_user": current_user,
                "session": session,
            }
        )
        return _meeting_read()

    monkeypatch.setattr(
        MeetingUpdateService,
        "update_meeting",
        staticmethod(fake_update_meeting),
    )

    response = client.patch("/meetings/321", json={"title": "Interview"})

    assert response.status_code == 200
    assert response.json()["id"] == 321
    assert len(calls) == 1
    assert calls[0]["meeting_id"] == 321
    assert calls[0]["update_data"].title == "Interview"
    assert calls[0]["current_user"]["email"] == "recruiter@example.com"
    assert calls[0]["session"] is dummy_session


def test_update_meeting_preserves_http_errors(monkeypatch):
    client, _ = _build_client()

    def fake_update_meeting(*, meeting_id, update_data, current_user, session):
        raise HTTPException(status_code=404, detail="Meeting not found")

    monkeypatch.setattr(
        MeetingUpdateService,
        "update_meeting",
        staticmethod(fake_update_meeting),
    )

    response = client.patch("/meetings/321", json={"title": "Interview"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Meeting not found"
