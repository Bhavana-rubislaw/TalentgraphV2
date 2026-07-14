# """
# Performance tests: verify recommendation scoring latency targets.

# These tests measure wall-clock time for the local adapter's scoring kernel
# with N profiles to ensure in-process scoring remains within acceptable bounds
# as the dataset grows.

# Targets:
#     - 50  profiles → p95 < 200ms
#     - 200 profiles → p95 < 500ms
#     - 500 profiles → total run < 2000ms

# Run:
#     cd backend2
#     python -m pytest tests/test_recommendation_performance.py -v -s
# """

# from __future__ import annotations

# import json
# import os
# import time
# from unittest.mock import MagicMock

# import pytest

# os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
# os.environ.setdefault("RECOMMENDER_DATABASE_URL", "sqlite:///:memory:")


# def _make_posting():
#     jp = MagicMock()
#     jp.id = 1
#     jp.company_id = 10
#     jp.job_title = "SAP FICO"
#     jp.job_role = "Consultant"
#     jp.product_vendor = "SAP"
#     jp.product_type = "ERP"
#     jp.seniority_level = "3-5"
#     jp.required_skills = json.dumps(["FICO", "GL", "AR", "AP", "COPA", "FSCM"])
#     jp.salary_min = 90000
#     jp.salary_max = 130000
#     jp.location = "Remote"
#     jp.worktype = "remote"
#     return jp


# def _make_profile(i: int):
#     p = MagicMock()
#     p.id = i
#     p.candidate_id = i
#     p.profile_name = f"Profile {i}"
#     p.job_role = "Consultant"
#     p.product_vendor = "SAP"
#     p.product_type = "ERP"
#     p.years_of_experience = (i % 10) + 1
#     p.salary_min = 80000
#     p.salary_max = 120000
#     p.worktype = "remote"
#     p.seniority_level = "3-5"
#     candidate = MagicMock()
#     candidate.id = i
#     candidate.name = f"Candidate {i}"
#     candidate.email = f"cand{i}@example.com"
#     candidate.location_state = "NY"
#     p.candidate = candidate
#     return p


# def _build_session(profiles: list, posting=None):
#     session = MagicMock()

#     def _get(model_cls, pk):
#         from app.models import JobPosting
#         if model_cls is JobPosting and posting and posting.id == pk:
#             return posting
#         return None

#     session.get.side_effect = _get

#     # Return empty skills / swipes / matches / location prefs
#     mock_exec = MagicMock()
#     mock_exec.all.return_value = []
#     mock_exec.first.return_value = None
#     session.exec.return_value = mock_exec

#     return session


# class TestScoringPerformance:
#     """Benchmark scoring kernel on synthetic datasets of increasing size."""

#     def _run_scoring_batch(self, n_profiles: int) -> float:
#         from app.recommender.adapters.local_adapter import LocalRecommendationAdapter
#         from unittest.mock import patch

#         adapter = LocalRecommendationAdapter()
#         posting = _make_posting()
#         profiles = [_make_profile(i) for i in range(1, n_profiles + 1)]
#         session = _build_session(profiles, posting)

#         with patch("app.recommender.adapters.local_adapter.select") as mock_select:
#             mock_exec = MagicMock()
#             mock_exec.all.return_value = profiles
#             mock_exec.first.return_value = None
#             session.exec.return_value = mock_exec

#             start = time.perf_counter()
#             result = adapter.rank_candidates_for_job(
#                 job_id=1, company_id=10, session=session, min_score=0, limit=n_profiles
#             )
#             elapsed_ms = (time.perf_counter() - start) * 1000

#         return elapsed_ms

#     @pytest.mark.parametrize("n_profiles", [50, 200])
#     def test_scoring_latency_under_500ms(self, n_profiles: int):
#         """Scoring N profiles should complete within 500ms."""
#         latency = self._run_scoring_batch(n_profiles)
#         print(f"\n  {n_profiles} profiles → {latency:.0f}ms")
#         assert latency < 500, (
#             f"Scoring {n_profiles} profiles took {latency:.0f}ms — exceeds 500ms target"
#         )

#     def test_scoring_500_profiles_under_2000ms(self):
#         """500-profile batch must complete in under 2 seconds total."""
#         latency = self._run_scoring_batch(500)
#         print(f"\n  500 profiles → {latency:.0f}ms")
#         assert latency < 2000, (
#             f"500-profile batch took {latency:.0f}ms — exceeds 2000ms SLO"
#         )


# class TestScoringDeterminism:
#     """Verify that the scoring kernel is deterministic for the same inputs."""

#     def test_same_inputs_produce_same_score(self):
#         from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

#         adapter = LocalRecommendationAdapter()
#         posting = _make_posting()
#         profile = _make_profile(1)
#         session = _build_session([profile], posting)

#         mock_exec = MagicMock()
#         mock_exec.all.return_value = []
#         mock_exec.first.return_value = None
#         session.exec.return_value = mock_exec

#         scores = [
#             adapter._calculate_match_score(posting, profile, session)["score"]
#             for _ in range(5)
#         ]
#         assert len(set(scores)) == 1, f"Non-deterministic scores: {scores}"

#     def test_score_within_0_to_100(self):
#         from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

#         adapter = LocalRecommendationAdapter()
#         posting = _make_posting()

#         session = MagicMock()
#         mock_exec = MagicMock()
#         mock_exec.all.return_value = []
#         mock_exec.first.return_value = None
#         session.exec.return_value = mock_exec

#         # Test multiple profiles with varying experience
#         for exp in [0, 1, 3, 5, 10, 20]:
#             profile = _make_profile(exp + 1)
#             profile.years_of_experience = exp
#             result = adapter._calculate_match_score(posting, profile, session)
#             score = result["score"]
#             assert 0 <= score <= 100, f"Score {score} out of range for exp={exp}"
"""
Performance tests: verify recommendation scoring latency targets.

These tests measure wall-clock time for the local adapter's scoring kernel
with N profiles to ensure in-process scoring remains within acceptable bounds
as the dataset grows.

Targets:
    - 50  profiles → p95 < 200ms
    - 200 profiles → p95 < 500ms
    - 500 profiles → total run < 2000ms

Run:
    cd backend2
    python -m pytest tests/test_recommendation_performance.py -v -s
"""

from __future__ import annotations

import json
import os
import time
from unittest.mock import MagicMock

import pytest

from app.models import WorkType

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("RECOMMENDER_DATABASE_URL", "sqlite:///:memory:")


def _make_posting():
    jp = MagicMock()
    jp.id = 1
    jp.company_id = 10
    jp.job_title = "SAP FICO"
    jp.job_role = "Consultant"
    jp.product_vendor = "SAP"
    jp.product_type = "ERP"
    jp.seniority_level = "3-5"
    jp.required_skills = json.dumps(["FICO", "GL", "AR", "AP", "COPA", "FSCM"])
    jp.salary_min = 90000
    jp.salary_max = 130000
    jp.location = "Remote"
    jp.worktype = WorkType.REMOTE
    return jp


def _make_profile(i: int):
    p = MagicMock()
    p.id = i
    p.candidate_id = i
    p.profile_name = f"Profile {i}"
    p.job_role = "Consultant"
    p.product_vendor = "SAP"
    p.product_type = "ERP"
    p.years_of_experience = (i % 10) + 1
    p.salary_min = 80000
    p.salary_max = 120000
    p.worktype = WorkType.REMOTE
    p.seniority_level = "3-5"
    candidate = MagicMock()
    candidate.id = i
    candidate.name = f"Candidate {i}"
    candidate.email = f"cand{i}@example.com"
    candidate.location_state = "NY"
    p.candidate = candidate
    return p


def _build_session(profiles: list, posting=None):
    session = MagicMock()

    def _get(model_cls, pk):
        from app.models import JobPosting
        if model_cls is JobPosting and posting and posting.id == pk:
            return posting
        return None

    session.get.side_effect = _get

    # Return empty skills / swipes / matches / location prefs
    mock_exec = MagicMock()
    mock_exec.all.return_value = []
    mock_exec.first.return_value = None
    session.exec.return_value = mock_exec

    return session


def _exec_side_effect_for(job_profiles):
    """Build a session.exec side_effect that only returns job_profiles for
    JobProfile queries; every other query (Skill/Swipe/Match/LocationPreference)
    gets an empty result. Discriminates by the statement's target model via
    column_descriptions instead of a single blanket return_value, which
    previously leaked JobProfile mocks into the location-preference query
    and caused un-configured MagicMock attributes to hit string comparisons
    downstream.
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


class TestScoringPerformance:
    """Benchmark scoring kernel on synthetic datasets of increasing size."""

    def _run_scoring_batch(self, n_profiles: int) -> float:
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        adapter = LocalRecommendationAdapter()
        posting = _make_posting()
        profiles = [_make_profile(i) for i in range(1, n_profiles + 1)]
        session = _build_session(profiles, posting)

        session.exec.side_effect = _exec_side_effect_for(profiles)

        start = time.perf_counter()
        result = adapter.rank_candidates_for_job(
            job_id=1, company_id=10, session=session, min_score=0, limit=n_profiles
        )
        elapsed_ms = (time.perf_counter() - start) * 1000

        return elapsed_ms

    @pytest.mark.parametrize("n_profiles", [50, 200])
    def test_scoring_latency_under_500ms(self, n_profiles: int):
        """Scoring N profiles should complete within 500ms."""
        latency = self._run_scoring_batch(n_profiles)
        print(f"\n  {n_profiles} profiles → {latency:.0f}ms")
        assert latency < 500, (
            f"Scoring {n_profiles} profiles took {latency:.0f}ms — exceeds 500ms target"
        )

    def test_scoring_500_profiles_under_2000ms(self):
        """500-profile batch must complete in under 2 seconds total."""
        latency = self._run_scoring_batch(500)
        print(f"\n  500 profiles → {latency:.0f}ms")
        assert latency < 2000, (
            f"500-profile batch took {latency:.0f}ms — exceeds 2000ms SLO"
        )


class TestScoringDeterminism:
    """Verify that the scoring kernel is deterministic for the same inputs."""

    def test_same_inputs_produce_same_score(self):
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        adapter = LocalRecommendationAdapter()
        posting = _make_posting()
        profile = _make_profile(1)
        session = _build_session([profile], posting)

        mock_exec = MagicMock()
        mock_exec.all.return_value = []
        mock_exec.first.return_value = None
        session.exec.return_value = mock_exec

        scores = [
            adapter._calculate_match_score(posting, profile, session)["score"]
            for _ in range(5)
        ]
        assert len(set(scores)) == 1, f"Non-deterministic scores: {scores}"

    def test_score_within_0_to_100(self):
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter

        adapter = LocalRecommendationAdapter()
        posting = _make_posting()

        session = MagicMock()
        mock_exec = MagicMock()
        mock_exec.all.return_value = []
        mock_exec.first.return_value = None
        session.exec.return_value = mock_exec

        # Test multiple profiles with varying experience
        for exp in [0, 1, 3, 5, 10, 20]:
            profile = _make_profile(exp + 1)
            profile.years_of_experience = exp
            result = adapter._calculate_match_score(posting, profile, session)
            score = result["score"]
            assert 0 <= score <= 100, f"Score {score} out of range for exp={exp}"