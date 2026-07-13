from types import SimpleNamespace

from app.services.application_router_workflow_service import ApplicationRouterWorkflowService


def test_apply_request_id_propagates_to_application_service(monkeypatch):
    calls = []

    class Session:
        def get(self, model, entity_id):
            model_name = getattr(model, "__name__", "")
            if model_name == "JobProfile":
                return SimpleNamespace(id=22, candidate_id=33)
            if model_name == "JobPosting":
                return SimpleNamespace(id=44)
            return None

    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: SimpleNamespace(id=11, email=email),
    )
    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_candidate_for_user_or_404",
        lambda s, user_id, detail=None: SimpleNamespace(id=33),
    )

    def fake_apply(**kwargs):
        calls.append(kwargs)
        return {"ok": True}

    monkeypatch.setattr(
        "app.services.application_router_workflow_service.ApplicationService.apply",
        fake_apply,
    )

    result = ApplicationRouterWorkflowService.apply_to_job(
        data=SimpleNamespace(job_profile_id=22, job_posting_id=44),
        request=SimpleNamespace(state=SimpleNamespace(request_id="req-apply-1")),
        current_user={"email": "u@example.com", "user_id": 11},
        session=Session(),
    )

    assert result == {"ok": True}
    assert calls[0]["request_id"] == "req-apply-1"


def test_update_status_request_id_propagates_to_application_service(monkeypatch):
    calls = []

    class Session:
        def get(self, model, entity_id):
            model_name = getattr(model, "__name__", "")
            if model_name == "Application":
                return SimpleNamespace(id=9, job_posting_id=77)
            if model_name == "JobPosting":
                return SimpleNamespace(id=77, company_id=555)
            return None

    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: SimpleNamespace(id=12, role="recruiter", email=email),
    )
    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_company_for_user_or_403",
        lambda s, user_id: SimpleNamespace(company_name="Acme"),
    )
    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_company_namespace_ids",
        lambda s, company_name: [555],
    )

    def fake_update_status(**kwargs):
        calls.append(kwargs)
        return {"ok": True}

    monkeypatch.setattr(
        "app.services.application_router_workflow_service.ApplicationService.update_status",
        fake_update_status,
    )

    result = ApplicationRouterWorkflowService.update_application_status(
        application_id=9,
        data=SimpleNamespace(status="scheduled"),
        request=SimpleNamespace(state=SimpleNamespace(request_id="req-status-1")),
        current_user={"email": "r@example.com", "user_id": 12},
        session=Session(),
    )

    assert result == {"ok": True}
    assert calls[0]["request_id"] == "req-status-1"


def test_update_review_request_id_propagates_to_application_service(monkeypatch):
    calls = []

    class Session:
        def get(self, model, entity_id):
            model_name = getattr(model, "__name__", "")
            if model_name == "Application":
                return SimpleNamespace(id=9, job_posting_id=77)
            if model_name == "JobPosting":
                return SimpleNamespace(id=77, company_id=555)
            return None

    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: SimpleNamespace(id=12, role="hr", email=email),
    )
    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_company_for_user_or_403",
        lambda s, user_id: SimpleNamespace(company_name="Acme"),
    )
    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_company_namespace_ids",
        lambda s, company_name: [555],
    )

    def fake_update_review(**kwargs):
        calls.append(kwargs)
        return {"ok": True}

    monkeypatch.setattr(
        "app.services.application_router_workflow_service.ApplicationService.update_review",
        fake_update_review,
    )

    result = ApplicationRouterWorkflowService.update_application_review(
        application_id=9,
        data=SimpleNamespace(status="under_review", recruiter_notes="good"),
        request=SimpleNamespace(state=SimpleNamespace(request_id="req-review-1")),
        current_user={"email": "hr@example.com", "user_id": 12},
        session=Session(),
    )

    assert result == {"ok": True}
    assert calls[0]["request_id"] == "req-review-1"


def test_withdraw_request_id_propagates_to_audit_log(monkeypatch):
    calls = []

    application = SimpleNamespace(id=123, candidate_id=33)

    class ExecResult:
        def all(self):
            return []

    class Session:
        def get(self, model, entity_id):
            model_name = getattr(model, "__name__", "")
            if model_name == "Application":
                return application
            return None

        def exec(self, query):
            return ExecResult()

        def add(self, obj):
            return None

        def flush(self):
            return None

        def delete(self, obj):
            return None

        def commit(self):
            return None

    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_user_by_email_or_404",
        lambda s, email: SimpleNamespace(id=11, email=email),
    )
    monkeypatch.setattr(
        "app.services.application_router_workflow_service.UserContextService.get_candidate_for_user_or_404",
        lambda s, user_id: SimpleNamespace(id=33),
    )
    monkeypatch.setattr(
        "app.services.application_router_workflow_service.snap_application",
        lambda app: {"id": app.id},
    )

    def fake_log_activity(*args, **kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(
        "app.services.application_router_workflow_service.log_activity_event",
        fake_log_activity,
    )

    result = ApplicationRouterWorkflowService.withdraw_application(
        application_id=123,
        request=SimpleNamespace(state=SimpleNamespace(request_id="req-withdraw-1")),
        current_user={"email": "u@example.com", "user_id": 11},
        session=Session(),
    )

    assert result == {"message": "Application withdrawn successfully"}
    assert calls[0]["request_id"] == "req-withdraw-1"
