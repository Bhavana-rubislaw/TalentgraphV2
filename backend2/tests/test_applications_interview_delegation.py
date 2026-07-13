from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.database import get_session
from app.routers import applications
from app.security import get_current_user
from app.services.interview_scheduling_service import InterviewSchedulingService


def _build_client():
    app = FastAPI()
    app.include_router(applications.router)

    class DummySession:
        pass

    dummy_session = DummySession()

    def override_user():
        return {"email": "recruiter@example.com", "user_id": 42, "role": "recruiter"}

    def override_session():
        yield dummy_session

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_session] = override_session
    return TestClient(app), dummy_session


def test_schedule_interview_delegates_to_service(monkeypatch):
    client, dummy_session = _build_client()
    calls = []

    def fake_schedule_interview(*, application_id, payload, current_user, session, request_id):
        calls.append(
            {
                "application_id": application_id,
                "payload": payload,
                "current_user": current_user,
                "session": session,
                "request_id": request_id,
            }
        )
        return {"success": True, "message": "delegated"}

    monkeypatch.setattr(
        InterviewSchedulingService,
        "schedule_interview",
        staticmethod(fake_schedule_interview),
    )

    payload = {
        "date": "March 27, 2026",
        "start_time": "10:00 AM",
        "end_time": "11:00 AM",
        "timezone": "UTC",
        "meeting_provider": "zoom",
        "meeting_link": None,
        "notes_for_candidate": "Bring updated resume",
        "email_subject": "Interview Confirmation",
    }

    response = client.post("/applications/123/schedule-interview", json=payload)

    assert response.status_code == 200
    assert response.json() == {"success": True, "message": "delegated"}
    assert len(calls) == 1
    assert calls[0]["application_id"] == 123
    assert calls[0]["payload"]["date"] == "March 27, 2026"
    assert calls[0]["current_user"]["email"] == "recruiter@example.com"
    assert calls[0]["session"] is dummy_session
    assert calls[0]["request_id"] is None


def test_schedule_interview_preserves_http_errors(monkeypatch):
    client, _ = _build_client()

    def fake_schedule_interview(*, application_id, payload, current_user, session, request_id):
        raise HTTPException(status_code=400, detail="Interview start time is required")

    monkeypatch.setattr(
        InterviewSchedulingService,
        "schedule_interview",
        staticmethod(fake_schedule_interview),
    )

    payload = {
        "date": "March 27, 2026",
        "timezone": "UTC",
    }

    response = client.post("/applications/123/schedule-interview", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "Interview start time is required"


def test_schedule_interview_preserves_response_shape(monkeypatch):
    client, _ = _build_client()

    expected = {
        "success": True,
        "message": "Interview scheduled!",
        "application_id": 123,
        "candidate_email": "candidate@example.com",
        "recruiter_email": "recruiter@example.com",
        "from_email": "talentgraph.interviews@gmail.com",
        "scheduled_by": "recruiter@example.com",
        "interview_datetime": "March 27, 2026 at 10:00 AM",
        "timezone": "UTC",
        "meeting_link": "https://example.com/meeting",
        "video_provider": "zoom",
        "auto_generated": True,
        "email_sent": True,
        "email_error": None,
        "notification_sent": True,
    }

    def fake_schedule_interview(*, application_id, payload, current_user, session, request_id):
        return expected

    monkeypatch.setattr(
        InterviewSchedulingService,
        "schedule_interview",
        staticmethod(fake_schedule_interview),
    )

    payload = {
        "date": "March 27, 2026",
        "start_time": "10:00 AM",
        "timezone": "UTC",
    }
    response = client.post("/applications/123/schedule-interview", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == set(expected.keys())
    assert body == expected
