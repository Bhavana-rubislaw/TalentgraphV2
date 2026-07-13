from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.database import get_session
from app.routers import applications
from app.security import get_current_user
from app.services.application_service import ApplicationService


class DummyResult:
    def __init__(self, value):
        self._value = value

    def first(self):
        return self._value

    def all(self):
        return self._value


class DummySession:
    def __init__(self):
        self.user = None
        self.company = None
        self.company_ids = None
        self.application = None
        self.job_posting = None

    def exec(self, _query):
        if self.user is not None:
            value = self.user
            self.user = None
            return DummyResult(value)
        if self.company is not None:
            value = self.company
            self.company = None
            return DummyResult(value)
        if self.company_ids is not None:
            value = self.company_ids
            self.company_ids = None
            return DummyResult(value)
        return DummyResult([])

    def get(self, model, _id):
        name = getattr(model, "__name__", "")
        if name == "Application":
            return self.application
        if name == "JobPosting":
            return self.job_posting
        return None


def _build_client(dummy_session):
    app = FastAPI()
    app.include_router(applications.router)

    def override_user():
        return {"email": "recruiter@example.com", "user_id": 7, "role": "recruiter"}

    def override_session():
        yield dummy_session

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_session] = override_session
    return TestClient(app)


def _mk_obj(**kwargs):
    return type("Obj", (), kwargs)()


def test_update_status_delegates_to_service(monkeypatch):
    session = DummySession()
    session.user = _mk_obj(id=7, role="recruiter")
    session.company = _mk_obj(id=11, company_name="Acme")
    session.company_ids = [11]
    session.application = _mk_obj(id=123, job_posting_id=22)
    session.job_posting = _mk_obj(id=22, company_id=11)

    client = _build_client(session)
    calls = []

    def fake_update_status(*, session, application, job_posting, new_status, actor, request_id):
        calls.append(
            {
                "session": session,
                "application": application,
                "job_posting": job_posting,
                "new_status": new_status,
                "actor": actor,
                "request_id": request_id,
            }
        )
        return {"message": "ok", "new_status": new_status}

    monkeypatch.setattr(ApplicationService, "update_status", staticmethod(fake_update_status))

    response = client.put("/applications/123/status", json={"status": "shortlisted"})

    assert response.status_code == 200
    assert response.json()["new_status"] == "shortlisted"
    assert len(calls) == 1
    assert calls[0]["session"] is session
    assert calls[0]["application"].id == 123
    assert calls[0]["job_posting"].id == 22
    assert calls[0]["new_status"] == "shortlisted"
    assert calls[0]["actor"].id == 7


def test_update_review_delegates_to_service(monkeypatch):
    session = DummySession()
    session.user = _mk_obj(id=7, role="recruiter")
    session.company = _mk_obj(id=11, company_name="Acme")
    session.company_ids = [11]
    session.application = _mk_obj(id=777, job_posting_id=22)
    session.job_posting = _mk_obj(id=22, company_id=11)

    client = _build_client(session)
    calls = []

    def fake_update_review(*, session, application, job_posting, actor, new_status, recruiter_notes, request_id):
        calls.append(
            {
                "session": session,
                "application": application,
                "job_posting": job_posting,
                "actor": actor,
                "new_status": new_status,
                "recruiter_notes": recruiter_notes,
                "request_id": request_id,
            }
        )
        return {"message": "review updated"}

    monkeypatch.setattr(ApplicationService, "update_review", staticmethod(fake_update_review))

    response = client.put(
        "/applications/777/review",
        json={"status": "under_review", "recruiter_notes": "Strong profile"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "review updated"
    assert len(calls) == 1
    assert calls[0]["session"] is session
    assert calls[0]["application"].id == 777
    assert calls[0]["job_posting"].id == 22
    assert calls[0]["actor"].id == 7
    assert calls[0]["new_status"] == "under_review"
    assert calls[0]["recruiter_notes"] == "Strong profile"


def test_update_status_preserves_service_http_error(monkeypatch):
    session = DummySession()
    session.user = _mk_obj(id=7, role="recruiter")
    session.company = _mk_obj(id=11, company_name="Acme")
    session.company_ids = [11]
    session.application = _mk_obj(id=123, job_posting_id=22)
    session.job_posting = _mk_obj(id=22, company_id=11)

    client = _build_client(session)

    def fake_update_status(*, session, application, job_posting, new_status, actor, request_id):
        raise HTTPException(status_code=400, detail="Invalid transition")

    monkeypatch.setattr(ApplicationService, "update_status", staticmethod(fake_update_status))

    response = client.put("/applications/123/status", json={"status": "selected"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid transition"
