"""
Sync pipeline tests: backfill and incremental sync worker correctness.

Tests use an in-memory SQLite recommender DB and a mocked core DB session
to avoid requiring a live PostgreSQL instance in CI.

Run:
    cd backend2
    python -m pytest tests/test_recommendation_sync.py -v
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

# Point both engines to SQLite in-memory for testing
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("RECOMMENDER_DATABASE_URL", "sqlite:///:memory:")


def _make_mock_job_profile(id: int, candidate_id: int = 1) -> MagicMock:
    p = MagicMock()
    p.id = id
    p.candidate_id = candidate_id
    p.profile_name = f"Profile {id}"
    p.job_role = "Consultant"
    p.product_vendor = "SAP"
    p.product_type = "ERP"
    p.years_of_experience = 4
    p.salary_min = 80000
    p.salary_max = 120000
    p.worktype = MagicMock(value="remote")
    p.seniority_level = "3-5"
    p.updated_at = datetime.utcnow() - timedelta(hours=1)
    p.created_at = datetime.utcnow() - timedelta(hours=2)
    return p


def _make_mock_candidate(id: int = 1) -> MagicMock:
    c = MagicMock()
    c.id = id
    c.name = "Alice"
    c.email = "alice@example.com"
    c.location_state = "CA"
    return c


def _make_mock_job_posting(id: int, company_id: int = 10) -> MagicMock:
    p = MagicMock()
    p.id = id
    p.company_id = company_id
    p.job_title = "SAP FICO Consultant"
    p.job_role = "Consultant"
    p.product_vendor = "SAP"
    p.product_type = "ERP"
    p.seniority_level = "3-5"
    p.required_skills = json.dumps(["FICO", "GL"])
    p.salary_min = 90000
    p.salary_max = 130000
    p.location = "Remote"
    p.worktype = "remote"
    p.status = MagicMock(value="active")
    p.updated_at = datetime.utcnow() - timedelta(hours=1)
    p.created_at = datetime.utcnow() - timedelta(hours=2)
    return p


class TestBackfillWorkerUnit:
    """Unit tests for BackfillWorker using mocked DB sessions."""

    def test_extract_job_profile_features_structure(self):
        """Feature extraction should return all required scoring keys."""
        from app.recommender.sync.backfill import BackfillWorker

        worker = BackfillWorker()
        profile = _make_mock_job_profile(1)
        candidate = _make_mock_candidate(1)

        with patch("app.recommender.sync.backfill.Session") as MockSession:
            mock_session = MagicMock()
            mock_exec = MagicMock()
            mock_exec.all.return_value = []  # no skills
            mock_session.exec.return_value = mock_exec
            mock_session.get.return_value = candidate
            MockSession.return_value.__enter__ = lambda s, *a: mock_session
            MockSession.return_value.__exit__ = MagicMock(return_value=False)

            features = worker._extract_job_profile_features(profile)

        assert "job_role" in features
        assert "product_vendor" in features
        assert "years_of_experience" in features
        assert "skills" in features
        assert isinstance(features["skills"], list)

    def test_extract_job_posting_features_structure(self):
        """Posting feature extraction should include all scoring-relevant fields."""
        from app.recommender.sync.backfill import BackfillWorker

        worker = BackfillWorker()
        posting = _make_mock_job_posting(1)
        features = worker._extract_job_posting_features(posting)

        assert "job_role" in features
        assert "product_vendor" in features
        assert "required_skills" in features
        assert "salary_min" in features


class TestIncrementalSyncUnit:
    """Unit tests for IncrementalSyncWorker watermark handling."""

    def test_get_watermark_returns_epoch_when_no_watermark(self):
        """Should return the epoch sentinel when no watermark row exists."""
        from app.recommender.sync.incremental import IncrementalSyncWorker, _EPOCH

        worker = IncrementalSyncWorker()

        with patch("app.recommender.sync.incremental.Session") as MockSession:
            mock_session = MagicMock()
            mock_exec = MagicMock()
            mock_exec.first.return_value = None
            mock_session.exec.return_value = mock_exec
            MockSession.return_value.__enter__ = lambda s, *a: mock_session
            MockSession.return_value.__exit__ = MagicMock(return_value=False)

            watermark = worker._get_watermark("job_profile")

        assert watermark == _EPOCH

    def test_get_watermark_returns_stored_value(self):
        """Should return the persisted watermark timestamp."""
        from app.recommender.sync.incremental import IncrementalSyncWorker
        from app.recommender.models import RecommendationSyncWatermark

        stored_ts = datetime(2025, 6, 1, 12, 0, 0)
        mock_wm = MagicMock(spec=RecommendationSyncWatermark)
        mock_wm.last_synced_at = stored_ts

        worker = IncrementalSyncWorker()

        with patch("app.recommender.sync.incremental.Session") as MockSession:
            mock_session = MagicMock()
            mock_exec = MagicMock()
            mock_exec.first.return_value = mock_wm
            mock_session.exec.return_value = mock_exec
            MockSession.return_value.__enter__ = lambda s, *a: mock_session
            MockSession.return_value.__exit__ = MagicMock(return_value=False)

            watermark = worker._get_watermark("job_profile")

        assert watermark == stored_ts


class TestFeatureFlagUnit:
    """Unit tests for the feature flag evaluation layer."""

    def test_defaults(self):
        """Defaults should be safe for a blank environment."""
        for key in ["RECOMMENDER_ENABLED", "RECOMMENDER_MODE", "RECOMMENDER_SHADOW_COMPARE"]:
            os.environ.pop(key, None)

        from importlib import reload
        import app.core.feature_flags as ff
        reload(ff)

        assert ff.flags.recommender_enabled is True
        assert ff.flags.recommender_mode.value == "local"
        assert ff.flags.recommender_shadow_compare is False

    def test_as_dict_keys(self):
        """as_dict() should contain all expected keys for the health endpoint."""
        from importlib import reload
        import app.core.feature_flags as ff
        reload(ff)

        d = ff.flags.as_dict()
        assert "recommender_enabled" in d
        assert "recommender_mode" in d
        assert "recommender_shadow_compare" in d
        assert "recommender_min_score_threshold" in d
