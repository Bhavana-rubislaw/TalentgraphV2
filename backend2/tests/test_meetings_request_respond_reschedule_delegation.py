from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.database import get_session
from app.routers import meetings
from app.schemas import MeetingRead, MeetingStatus, MeetingType
from app.security import get_current_user
from app.services.meeting_request_reschedule_service import MeetingRequestRescheduleService
from app.services.meeting_respond_reschedule_service import MeetingRespondRescheduleService


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


def _meeting_read(status=MeetingStatus.SCHEDULED) -> MeetingRead:
    now = datetime.now(timezone.utc)
    return MeetingRead(
        id=909,
        title="Interview",
        description="Reschedule flow",
        meeting_type=MeetingType.INTERVIEW,
        status=status,
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


def test_request_reschedule_delegates_to_service(monkeypatch):
    client, dummy_session = _build_client()
    calls = []

    def fake_request_reschedule(*, meeting_id, request_data, current_user, session):
        calls.append(
            {
                "meeting_id": meeting_id,
                "request_data": request_data,
                "current_user": current_user,
                "session": session,
            }
        )
        return _meeting_read(status=MeetingStatus.RESCHEDULE_REQUESTED)

    monkeypatch.setattr(
        MeetingRequestRescheduleService,
        "request_reschedule",
        staticmethod(fake_request_reschedule),
    )

    response = client.post(
        "/meetings/909/request-reschedule",
        json={"reason": "Need a later slot", "preferred_times": ["2026-08-03T11:00:00Z"]},
    )

    assert response.status_code == 200
    assert response.json()["id"] == 909
    assert len(calls) == 1
    assert calls[0]["meeting_id"] == 909
    assert calls[0]["request_data"].reason == "Need a later slot"
    assert calls[0]["current_user"]["email"] == "recruiter@example.com"
    assert calls[0]["session"] is dummy_session


def test_request_reschedule_preserves_http_errors(monkeypatch):
    client, _ = _build_client()

    def fake_request_reschedule(*, meeting_id, request_data, current_user, session):
        raise HTTPException(status_code=400, detail="Can only request reschedule for scheduled meetings")

    monkeypatch.setattr(
        MeetingRequestRescheduleService,
        "request_reschedule",
        staticmethod(fake_request_reschedule),
    )

    response = client.post(
        "/meetings/909/request-reschedule",
        json={"reason": "Need a later slot"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Can only request reschedule for scheduled meetings"


def test_respond_reschedule_delegates_to_service(monkeypatch):
    client, dummy_session = _build_client()
    calls = []

    def fake_respond(*, meeting_id, response_data, current_user, session):
        calls.append(
            {
                "meeting_id": meeting_id,
                "response_data": response_data,
                "current_user": current_user,
                "session": session,
            }
        )
        return _meeting_read(status=MeetingStatus.SCHEDULED)

    monkeypatch.setattr(
        MeetingRespondRescheduleService,
        "respond_to_reschedule_request",
        staticmethod(fake_respond),
    )

    response = client.post(
        "/meetings/909/respond-reschedule",
        json={
            "approved": True,
            "scheduled_start": "2026-08-03T12:00:00Z",
            "scheduled_end": "2026-08-03T13:00:00Z",
            "timezone": "UTC",
            "response_note": "Approved",
        },
    )

    assert response.status_code == 200
    assert response.json()["id"] == 909
    assert len(calls) == 1
    assert calls[0]["meeting_id"] == 909
    assert calls[0]["response_data"].approved is True
    assert calls[0]["current_user"]["email"] == "recruiter@example.com"
    assert calls[0]["session"] is dummy_session


def test_respond_reschedule_preserves_http_errors(monkeypatch):
    client, _ = _build_client()

    def fake_respond(*, meeting_id, response_data, current_user, session):
        raise HTTPException(status_code=409, detail="User 7 has a scheduling conflict")

    monkeypatch.setattr(
        MeetingRespondRescheduleService,
        "respond_to_reschedule_request",
        staticmethod(fake_respond),
    )

    response = client.post(
        "/meetings/909/respond-reschedule",
        json={
            "approved": True,
            "scheduled_start": "2026-08-03T12:00:00Z",
            "scheduled_end": "2026-08-03T13:00:00Z",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "User 7 has a scheduling conflict"
