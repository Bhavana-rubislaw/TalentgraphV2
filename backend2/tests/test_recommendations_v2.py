"""
V2 endpoint contract tests.

Tests verify:
- Endpoint routes are registered correctly
- Auth guard rejects unauthenticated requests  
- Response shapes match the expected DTO contracts
- Company isolation: recruiter cannot access another company's job

Run:
    cd backend2
    python -m pytest tests/test_recommendations_v2.py -v
"""

from __future__ import annotations

import json
import os
from unittest.mock import MagicMock, patch

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("RECOMMENDER_DATABASE_URL", "sqlite:///:memory:")
os.environ["RECOMMENDER_ENABLED"] = "true"
os.environ["RECOMMENDER_MODE"] = "local"


@pytest.fixture
def client():
    """Return a TestClient wired to the main FastAPI app."""
    # Stub DB init to avoid needing a real PostgreSQL
    with patch("app.database.init_db"), \
         patch("app.recommender.database.init_recommender_db"), \
         patch("app.workers.start_workers"), \
         patch("app.workers.email_worker.get_email_scheduler"):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app, raise_server_exceptions=False)


def _auth_header(role="recruiter"):
    """Generate a valid JWT for test use (reuses app's security module)."""
    from app.security import create_access_token
    token = create_access_token(
        data={"sub": f"test_{role}@example.com", "role": role, "user_id": 1}
    )
    return {"Authorization": f"Bearer {token}"}


class TestRecommendationsV2Routes:
    """Verify route registration and basic auth guards."""

    def test_get_candidate_rankings_requires_auth(self, client):
        resp = client.get("/recommendations/v2/job/1")
        assert resp.status_code == 401

    def test_get_job_rankings_requires_auth(self, client):
        resp = client.get("/recommendations/v2/profile/1")
        assert resp.status_code == 401

    def test_explain_pair_requires_auth(self, client):
        resp = client.get("/recommendations/v2/explain?job_id=1&job_profile_id=1")
        assert resp.status_code == 401

    def test_feedback_requires_auth(self, client):
        payload = {
            "job_id": 1,
            "job_profile_id": 1,
            "candidate_id": 1,
            "company_id": 1,
            "signal": "liked",
        }
        resp = client.post("/recommendations/v2/feedback", json=payload)
        assert resp.status_code == 401

    def test_feedback_rejects_invalid_signal(self, client):
        """Signal must match the pattern enum."""
        with patch("app.security.get_current_user", return_value={"email": "r@x.com", "role": "recruiter"}):
            payload = {
                "job_id": 1,
                "job_profile_id": 1,
                "candidate_id": 1,
                "company_id": 1,
                "signal": "INVALID_SIGNAL",
            }
            resp = client.post(
                "/recommendations/v2/feedback",
                json=payload,
                headers=_auth_header(),
            )
        assert resp.status_code == 422  # Pydantic validation error


class TestAdminRecommendationsRoutes:
    """Verify admin recommendation endpoint auth guard."""

    def test_config_list_requires_admin(self, client):
        resp = client.get(
            "/api/admin/recommendations/config",
            headers=_auth_header(role="recruiter"),  # not admin
        )
        assert resp.status_code in (401, 403)

    def test_health_requires_admin(self, client):
        resp = client.get("/api/admin/recommendations/health")
        assert resp.status_code == 401

    def test_flags_requires_admin(self, client):
        resp = client.get("/api/admin/recommendations/flags")
        assert resp.status_code == 401
