"""
Contract tests: verify that LocalRecommendationAdapter and
StandaloneRecommendationAdapter (in local-fallback mode) return
structurally identical response shapes for all gateway methods.

These tests do NOT require a running recommender service; the standalone
adapter always falls back to local when the remote URL is unreachable,
which is the expected behaviour in CI.

Run:
    cd backend2
    python -m pytest tests/test_recommendation_gateway.py -v
"""

from __future__ import annotations

import json
import os
import pytest
from unittest.mock import MagicMock

from app.models import WorkType

# ── Fixtures & helpers ────────────────────────────────────────


def _make_job_posting(id=1, company_id=10):
    """Build a minimal JobPosting-like object."""
    jp = MagicMock()
    jp.id = id
    jp.company_id = company_id
    jp.job_title = "SAP FI Consultant"
    jp.job_role = "Consultant"
    jp.product_vendor = "SAP"
    jp.product_type = "ERP"
    jp.seniority_level = "3-5"
    jp.required_skills = json.dumps(["FICO", "GL Accounting", "AR"])
    jp.salary_min = 80000
    jp.salary_max = 120000
    jp.location = "New York"
    jp.worktype = WorkType.REMOTE
    jp.status = MagicMock(value="active")
    jp.updated_at = None
    jp.created_at = None
    return jp


def _make_job_profile(id=1, candidate_id=5):
    jp = MagicMock()
    jp.id = id
    jp.candidate_id = candidate_id
    jp.profile_name = "SAP Finance Profile"
    jp.job_role = "Consultant"
    jp.product_vendor = "SAP"
    jp.product_type = "ERP"
    jp.years_of_experience = 4
    jp.salary_min = 85000
    jp.salary_max = 115000
    jp.worktype = WorkType.REMOTE
    jp.seniority_level = "3-5"
    jp.updated_at = None
    jp.created_at = None
    return jp


def _make_candidate(id=5):
    c = MagicMock()
    c.id = id
    c.name = "Jane Smith"
    c.email = "jane@example.com"
    c.location_state = "New York"
    return c


def _build_mock_session(job_posting=None, job_profile=None):
    """Return a mock Session that returns appropriate objects on get/exec."""
    session = MagicMock()

    def _get(model_cls, pk):
        from app.models import JobPosting, JobProfile
        if model_cls is JobPosting and job_posting and job_posting.id == pk:
            return job_posting
        if model_cls is JobProfile and job_profile and job_profile.id == pk:
            return job_profile
        return None

    session.get.side_effect = _get

    # exec().all() used for skills, location prefs, swipes, matches
    mock_exec = MagicMock()
    mock_exec.all.return_value = []
    mock_exec.first.return_value = None
    session.exec.return_value = mock_exec

    # Provide candidate via job_profile.candidate
    if job_profile and job_posting:
        cand = _make_candidate(job_profile.candidate_id)
        job_profile.candidate = cand

    return session


def _exec_side_effect_for(job_profiles):
    """Build a session.exec side_effect that only returns job_profiles for
    JobProfile queries; every other query (Skill/Swipe/Match/LocationPreference)
    gets an empty result, matching what a real DB with no seeded rows for
    those tables would return. Discriminates by inspecting the statement's
    target model via column_descriptions rather than a single blanket
    return_value, which previously caused unrelated queries (e.g. the
    location-preference lookup) to receive JobProfile mocks instead of an
    empty list, leaking un-configured MagicMock attributes into string
    comparisons downstream.
    """
    from app.models import JobProfile

    def _side_effect(statement):
        mock_result = MagicMock()
        model_cls = statement.column_descriptions[0]["type"]
        if model_cls is JobProfile:
            mock_result.all.return_value = job_profiles
        else:
            mock_result.all.return_value = []
        mock_result.first.return_value = None
        return mock_result

    return _side_effect


# ── Gateway contract shape tests ─────────────────────────────


class TestLocalAdapterContract:
    """Verify LocalRecommendationAdapter returns correct DTO shapes."""

    def setup_method(self):
        os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
        os.environ.setdefault("RECOMMENDER_DATABASE_URL", "sqlite:///:memory:")

    def test_rank_candidates_returns_list(self):
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        adapter = LocalRecommendationAdapter()
        jp = _make_job_posting()
        profile = _make_job_profile()
        session = _build_mock_session(job_posting=jp, job_profile=profile)

        session.exec.side_effect = _exec_side_effect_for([profile])

        result = adapter.rank_candidates_for_job(
            job_id=1, company_id=10, session=session
        )

        assert isinstance(result, list)

    def test_explain_pair_keys(self):
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        adapter = LocalRecommendationAdapter()
        jp = _make_job_posting()
        profile = _make_job_profile()
        session = _build_mock_session(job_posting=jp, job_profile=profile)

        mock_exec = MagicMock()
        mock_exec.all.return_value = []
        mock_exec.first.return_value = None
        session.exec.return_value = mock_exec

        result = adapter.explain_pair(job_id=1, job_profile_id=1, session=session)

        assert "score" in result
        assert "details" in result
        assert "match_quality" in result
        assert "adapter" in result

    def test_explain_pair_missing_job(self):
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        adapter = LocalRecommendationAdapter()
        session = _build_mock_session()  # no job_posting or job_profile
        result = adapter.explain_pair(job_id=999, job_profile_id=999, session=session)

        assert "error" in result

    def test_rank_candidates_min_score_filter(self):
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        adapter = LocalRecommendationAdapter()
        jp = _make_job_posting()
        # Profile with mismatched vendor → expected score 0
        profile = _make_job_profile()
        profile.product_vendor = "Oracle"  # mismatch → score ~0
        session = _build_mock_session(job_posting=jp, job_profile=profile)

        session.exec.side_effect = _exec_side_effect_for([profile])

        result = adapter.rank_candidates_for_job(
            job_id=1, company_id=10, session=session, min_score=35
        )

        # Mismatched vendor → score 0, should not appear in results
        assert result == []


class TestStandaloneAdapterFallback:
    """Verify StandaloneRecommendationAdapter falls back to local on connection error."""

    def setup_method(self):
        os.environ["RECOMMENDER_SERVICE_URL"] = "http://127.0.0.1:19999"  # unreachable
        os.environ["RECOMMENDER_TIMEOUT_SECONDS"] = "0.1"

    def test_rank_candidates_fallback_on_connection_error(self):
        from app.recommender.adapters.standalone_adapter import StandaloneRecommendationAdapter

        adapter = StandaloneRecommendationAdapter()
        jp = _make_job_posting()
        session = _build_mock_session(job_posting=jp)

        mock_exec = MagicMock()
        mock_exec.all.return_value = []
        mock_exec.first.return_value = None
        session.exec.return_value = mock_exec

        # Should not raise — falls back to local
        result = adapter.rank_candidates_for_job(job_id=1, company_id=10, session=session)
        assert isinstance(result, list)


class TestGatewayFactory:
    """Verify get_gateway() returns the correct adapter based on flag."""

    def test_local_mode(self):
        os.environ["RECOMMENDER_ENABLED"] = "true"
        os.environ["RECOMMENDER_MODE"] = "local"
        from importlib import reload
        import app.core.feature_flags as ff
        reload(ff)

        from app.recommender.gateway import get_gateway
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        gateway = get_gateway()
        assert isinstance(gateway, LocalRecommendationAdapter)

    def test_disabled_returns_local(self):
        os.environ["RECOMMENDER_ENABLED"] = "false"
        from importlib import reload
        import app.core.feature_flags as ff
        reload(ff)

        from app.recommender.gateway import get_gateway
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        gateway = get_gateway()
        assert isinstance(gateway, LocalRecommendationAdapter)

    def test_standalone_mode(self):
        os.environ["RECOMMENDER_ENABLED"] = "true"
        os.environ["RECOMMENDER_MODE"] = "standalone"
        from importlib import reload
        import app.core.feature_flags as ff
        reload(ff)

        from app.recommender.gateway import get_gateway
        from app.recommender.adapters.standalone_adapter import StandaloneRecommendationAdapter

        gateway = get_gateway()
        assert isinstance(gateway, StandaloneRecommendationAdapter)

    def test_shadow_mode(self):
        os.environ["RECOMMENDER_ENABLED"] = "true"
        os.environ["RECOMMENDER_MODE"] = "shadow"
        from importlib import reload
        import app.core.feature_flags as ff
        reload(ff)

        from app.recommender.gateway import get_gateway
        from app.recommender.adapters.shadow_adapter import ShadowRecommendationAdapter

        gateway = get_gateway()
        assert isinstance(gateway, ShadowRecommendationAdapter)

    def test_unknown_mode_falls_back_to_local(self):
        os.environ["RECOMMENDER_ENABLED"] = "true"
        os.environ["RECOMMENDER_MODE"] = "invalid_mode"
        from importlib import reload
        import app.core.feature_flags as ff
        reload(ff)

        from app.recommender.gateway import get_gateway
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        gateway = get_gateway()
        assert isinstance(gateway, LocalRecommendationAdapter)
