from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.models import MeetingStatus
from app.services.meeting_cancel_service import MeetingCancelService
from app.services.meeting_request_reschedule_service import MeetingRequestRescheduleService
from app.services.meeting_reschedule_service import MeetingRescheduleService
from app.services.meeting_respond_reschedule_service import MeetingRespondRescheduleService


class _ExecResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _FakeSession:
    def __init__(self, meeting, users):
        self._meeting = meeting
        self._users = users

    def get(self, model, entity_id):
        model_name = getattr(model, "__name__", "")
        if model_name == "Meeting":
            return self._meeting
        if model_name == "User":
            return self._users.get(entity_id)
        return None

    def exec(self, query):
        return _ExecResult([])

    def add(self, entity):
        return None

    def commit(self):
        return None

    def refresh(self, entity):
        return None


def _build_meeting(status=MeetingStatus.SCHEDULED):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=42,
        title="Interview",
        organizer_user_id=99,
        status=status,
        scheduled_start=now,
        scheduled_end=now + timedelta(hours=1),
        timezone="UTC",
        application_id=333,
        participants=[SimpleNamespace(user_id=99), SimpleNamespace(user_id=77)],
        reschedule_requested_by_user_id=77,
    )


def test_cancel_side_effect_parity(monkeypatch):
    meeting = _build_meeting()
    current_user_obj = SimpleNamespace(id=99, full_name="Recruiter", email="recruiter@example.com", role="recruiter")
    users = {99: current_user_obj, 77: SimpleNamespace(id=77, full_name="Candidate", email="cand@example.com")}
    session = _FakeSession(meeting, users)

    calls = {"timeline": 0, "sync": 0, "notify": 0, "email": 0}

    monkeypatch.setattr(
        "app.services.meeting_cancel_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: current_user_obj,
    )
    monkeypatch.setattr(
        "app.services.meeting_cancel_service.MeetingService.create_timeline_event",
        lambda **kwargs: calls.__setitem__("timeline", calls["timeline"] + 1),
    )
    monkeypatch.setattr(
        "app.services.meeting_cancel_service.MeetingService.sync_application_status",
        lambda **kwargs: calls.__setitem__("sync", calls["sync"] + 1),
    )
    monkeypatch.setattr(
        "app.services.meeting_cancel_service.MeetingDispatchService.notify_user_ids",
        lambda **kwargs: calls.__setitem__("notify", calls["notify"] + 1),
    )
    monkeypatch.setattr(
        "app.services.meeting_cancel_service.MeetingDispatchService.send_cancelled_email_to_user_ids",
        lambda **kwargs: calls.__setitem__("email", calls["email"] + 1),
    )

    out = MeetingCancelService.cancel_meeting(
        meeting_id=42,
        cancel_data=SimpleNamespace(cancellation_reason="Conflict", canceller_name=None, canceller_email=None),
        current_user={"email": "recruiter@example.com", "user_id": 99},
        session=session,
    )

    assert out.status == MeetingStatus.CANCELLED
    assert calls == {"timeline": 1, "sync": 1, "notify": 1, "email": 1}


def test_request_reschedule_side_effect_parity(monkeypatch):
    meeting = _build_meeting(status=MeetingStatus.SCHEDULED)
    current_user_obj = SimpleNamespace(id=77, full_name="Candidate", email="cand@example.com", role="candidate")
    organizer = SimpleNamespace(id=99, full_name="Recruiter", email="recruiter@example.com")
    users = {99: organizer, 77: current_user_obj}
    session = _FakeSession(meeting, users)

    calls = {"timeline": 0, "sync": 0, "dispatch": 0}

    monkeypatch.setattr(
        "app.services.meeting_request_reschedule_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: current_user_obj,
    )
    monkeypatch.setattr(
        "app.services.meeting_request_reschedule_service.MeetingService.create_timeline_event",
        lambda **kwargs: calls.__setitem__("timeline", calls["timeline"] + 1),
    )
    monkeypatch.setattr(
        "app.services.meeting_request_reschedule_service.MeetingService.sync_application_status",
        lambda **kwargs: calls.__setitem__("sync", calls["sync"] + 1),
    )
    monkeypatch.setattr(
        "app.services.meeting_request_reschedule_service.MeetingDispatchService.send_reschedule_request_to_organizer",
        lambda **kwargs: calls.__setitem__("dispatch", calls["dispatch"] + 1),
    )

    out = MeetingRequestRescheduleService.request_reschedule(
        meeting_id=42,
        request_data=SimpleNamespace(reason="Need later", note="conflict", preferred_times=["2026-08-03T11:00:00Z"]),
        current_user={"email": "cand@example.com", "user_id": 77},
        session=session,
    )

    assert out.status == MeetingStatus.RESCHEDULE_REQUESTED
    assert calls == {"timeline": 1, "sync": 1, "dispatch": 1}


def test_reschedule_side_effect_parity(monkeypatch):
    meeting = _build_meeting(status=MeetingStatus.SCHEDULED)
    recruiter = SimpleNamespace(id=99, full_name="Recruiter", email="recruiter@example.com", role="recruiter")
    candidate = SimpleNamespace(id=77, full_name="Candidate", email="cand@example.com")
    users = {99: recruiter, 77: candidate}
    session = _FakeSession(meeting, users)

    calls = {"timeline": 0, "sync": 0, "notify": 0, "email": 0}

    class FakeEmailService:
        def __init__(self, queue_mode=True):
            pass

        def send_organizer_confirmation_email(self, **kwargs):
            calls["email"] += 1

        def send_reschedule_approved_email(self, **kwargs):
            calls["email"] += 1

    monkeypatch.setattr(
        "app.services.meeting_reschedule_service.MeetingConflictService.check_availability_conflict",
        lambda *args, **kwargs: False,
    )
    monkeypatch.setattr(
        "app.services.meeting_reschedule_service.UserContextService.get_user_by_id_optional",
        lambda s, uid: users.get(uid),
    )
    monkeypatch.setattr(
        "app.services.meeting_reschedule_service.MeetingService.create_timeline_event",
        lambda **kwargs: calls.__setitem__("timeline", calls["timeline"] + 1),
    )
    monkeypatch.setattr(
        "app.services.meeting_reschedule_service.MeetingService.sync_application_status",
        lambda **kwargs: calls.__setitem__("sync", calls["sync"] + 1),
    )
    monkeypatch.setattr(
        "app.services.meeting_reschedule_service.MeetingDispatchService.notify_user_ids",
        lambda **kwargs: calls.__setitem__("notify", calls["notify"] + 1),
    )
    monkeypatch.setattr("app.services.meeting_reschedule_service.MeetingEmailService", FakeEmailService)
    monkeypatch.setattr(
        "app.services.meeting_reschedule_service.MeetingService.generate_action_token",
        lambda *args, **kwargs: "token",
    )

    out = MeetingRescheduleService.reschedule_meeting(
        meeting_id=42,
        reschedule_data=SimpleNamespace(
            scheduled_start=datetime.now(timezone.utc) + timedelta(days=1),
            scheduled_end=datetime.now(timezone.utc) + timedelta(days=1, hours=1),
            timezone="UTC",
            reason="calendar",
        ),
        current_user={"email": "recruiter@example.com", "user_id": 99},
        session=session,
    )

    assert out.status == MeetingStatus.SCHEDULED
    assert calls["timeline"] == 1
    assert calls["sync"] == 1
    assert calls["notify"] == 1
    assert calls["email"] >= 1


def test_respond_reschedule_side_effect_parity(monkeypatch):
    meeting = _build_meeting(status=MeetingStatus.RESCHEDULE_REQUESTED)
    recruiter = SimpleNamespace(id=99, full_name="Recruiter", email="recruiter@example.com", role="recruiter")
    requester = SimpleNamespace(id=77, full_name="Candidate", email="cand@example.com")
    users = {99: recruiter, 77: requester}
    session = _FakeSession(meeting, users)

    calls = {"timeline": 0, "notify": 0, "email": 0}

    class FakeEmailService:
        def __init__(self, queue_mode=True):
            pass

        def send_reschedule_approved_email(self, **kwargs):
            calls["email"] += 1

    monkeypatch.setattr(
        "app.services.meeting_respond_reschedule_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: recruiter,
    )
    monkeypatch.setattr(
        "app.services.meeting_respond_reschedule_service.MeetingConflictService.check_availability_conflict",
        lambda *args, **kwargs: False,
    )
    monkeypatch.setattr(
        "app.services.meeting_respond_reschedule_service.MeetingService.create_timeline_event",
        lambda **kwargs: calls.__setitem__("timeline", calls["timeline"] + 1),
    )
    monkeypatch.setattr(
        "app.services.meeting_respond_reschedule_service.MeetingDispatchService.notify_user_ids",
        lambda **kwargs: calls.__setitem__("notify", calls["notify"] + 1),
    )
    monkeypatch.setattr("app.services.meeting_respond_reschedule_service.MeetingEmailService", FakeEmailService)
    monkeypatch.setattr(
        "app.services.meeting_respond_reschedule_service.MeetingService.generate_action_token",
        lambda *args, **kwargs: "token",
    )

    out = MeetingRespondRescheduleService.respond_to_reschedule_request(
        meeting_id=42,
        response_data=SimpleNamespace(
            approved=True,
            scheduled_start=datetime.now(timezone.utc) + timedelta(days=1),
            scheduled_end=datetime.now(timezone.utc) + timedelta(days=1, hours=1),
            timezone="UTC",
            response_note="ok",
        ),
        current_user={"email": "recruiter@example.com", "user_id": 99},
        session=session,
    )

    assert out.status == MeetingStatus.SCHEDULED
    assert calls["timeline"] == 1
    assert calls["notify"] == 1
    assert calls["email"] == 1
