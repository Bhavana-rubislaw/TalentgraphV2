import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.database import get_session
from app.routers import meetings
from app.security import get_current_user
from app.services.meeting_cancel_service import MeetingCancelService
from app.services.meeting_request_reschedule_service import MeetingRequestRescheduleService
from app.services.meeting_reschedule_service import MeetingRescheduleService
from app.services.meeting_respond_reschedule_service import MeetingRespondRescheduleService
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
    return TestClient(app)


ENDPOINT_CASES = [
    (
        "/meetings/101",
        "patch",
        {"title": "Interview"},
        MeetingUpdateService,
        "update_meeting",
    ),
    (
        "/meetings/101/cancel",
        "post",
        {"cancellation_reason": "Conflict"},
        MeetingCancelService,
        "cancel_meeting",
    ),
    (
        "/meetings/101/reschedule",
        "post",
        {
            "scheduled_start": "2026-08-01T10:00:00Z",
            "scheduled_end": "2026-08-01T11:00:00Z",
            "timezone": "UTC",
            "reason": "calendar",
        },
        MeetingRescheduleService,
        "reschedule_meeting",
    ),
    (
        "/meetings/101/request-reschedule",
        "post",
        {"reason": "Need later slot"},
        MeetingRequestRescheduleService,
        "request_reschedule",
    ),
    (
        "/meetings/101/respond-reschedule",
        "post",
        {
            "approved": True,
            "scheduled_start": "2026-08-03T12:00:00Z",
            "scheduled_end": "2026-08-03T13:00:00Z",
        },
        MeetingRespondRescheduleService,
        "respond_to_reschedule_request",
    ),
]


@pytest.mark.parametrize("status_code", [400, 403, 404, 409])
@pytest.mark.parametrize("url,method,payload,service_cls,method_name", ENDPOINT_CASES)
def test_extracted_endpoint_http_error_semantic_parity(
    monkeypatch,
    status_code,
    url,
    method,
    payload,
    service_cls,
    method_name,
):
    client = _build_client()
    detail = f"expected semantic error {status_code}"

    def raise_error(**kwargs):
        raise HTTPException(status_code=status_code, detail=detail)

    monkeypatch.setattr(service_cls, method_name, staticmethod(raise_error))

    response = getattr(client, method)(url, json=payload)

    assert response.status_code == status_code
    assert response.json()["detail"] == detail
