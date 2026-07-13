from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_session
from app.routers import meetings
from app.schemas import MeetingRead, MeetingStatus, MeetingType
from app.security import get_current_user
from app.services.meeting_cancel_service import MeetingCancelService
from app.services.meeting_request_reschedule_service import MeetingRequestRescheduleService
from app.services.meeting_reschedule_service import MeetingRescheduleService
from app.services.meeting_respond_reschedule_service import MeetingRespondRescheduleService
from app.services.meeting_update_service import MeetingUpdateService


EXPECTED_KEYS = {
    "id",
    "title",
    "description",
    "meeting_type",
    "status",
    "scheduled_start",
    "scheduled_end",
    "duration_minutes",
    "timezone",
    "organizer_user_id",
    "job_posting_id",
    "match_id",
    "application_id",
    "location",
    "video_meeting_url",
    "video_provider",
    "google_calendar_event_id",
    "microsoft_calendar_event_id",
    "cancelled_at",
    "cancelled_by_user_id",
    "cancellation_reason",
    "reschedule_requested_at",
    "reschedule_requested_by_user_id",
    "reschedule_request_reason",
    "reschedule_request_preferred_times",
    "created_at",
    "updated_at",
    "participants",
}


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


def _meeting_read(status: MeetingStatus = MeetingStatus.SCHEDULED) -> MeetingRead:
    now = datetime.now(timezone.utc)
    return MeetingRead(
        id=111,
        title="Interview",
        description="Contract parity",
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


@pytest.mark.parametrize(
    "url,method,payload,service_cls,method_name,status",
    [
        ("/meetings/111", "patch", {"title": "Interview"}, MeetingUpdateService, "update_meeting", MeetingStatus.SCHEDULED),
        (
            "/meetings/111/cancel",
            "post",
            {"cancellation_reason": "Conflict"},
            MeetingCancelService,
            "cancel_meeting",
            MeetingStatus.CANCELLED,
        ),
        (
            "/meetings/111/reschedule",
            "post",
            {
                "scheduled_start": "2026-08-01T10:00:00Z",
                "scheduled_end": "2026-08-01T11:00:00Z",
                "timezone": "UTC",
                "reason": "calendar",
            },
            MeetingRescheduleService,
            "reschedule_meeting",
            MeetingStatus.SCHEDULED,
        ),
        (
            "/meetings/111/request-reschedule",
            "post",
            {"reason": "Need later slot", "preferred_times": ["2026-08-03T11:00:00Z"]},
            MeetingRequestRescheduleService,
            "request_reschedule",
            MeetingStatus.RESCHEDULE_REQUESTED,
        ),
        (
            "/meetings/111/respond-reschedule",
            "post",
            {
                "approved": True,
                "scheduled_start": "2026-08-03T12:00:00Z",
                "scheduled_end": "2026-08-03T13:00:00Z",
                "timezone": "UTC",
            },
            MeetingRespondRescheduleService,
            "respond_to_reschedule_request",
            MeetingStatus.SCHEDULED,
        ),
    ],
)
def test_extracted_endpoint_response_contract_parity(
    monkeypatch,
    url,
    method,
    payload,
    service_cls,
    method_name,
    status,
):
    client = _build_client()

    monkeypatch.setattr(
        service_cls,
        method_name,
        staticmethod(lambda **kwargs: _meeting_read(status=status)),
    )

    response = getattr(client, method)(url, json=payload)

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == EXPECTED_KEYS
