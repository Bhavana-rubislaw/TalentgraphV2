"""
RecommendationGateway — abstract contract and factory.

All routing code, routers, and services must go through this interface.
No code outside this package may call recommendation DB models or scoring
functions directly.

Usage:
    from app.recommender.gateway import get_gateway

    gateway = get_gateway()
    results = gateway.rank_candidates_for_job(job_id, company_id, session)
    jobs    = gateway.rank_jobs_for_profile(job_profile_id, candidate_id, session)
    explain = gateway.explain_pair(job_id, job_profile_id, session)
    gateway.record_feedback(job_id, job_profile_id, candidate_id, company_id,
                            actor_user_id, signal, score_at_feedback, rec_session)
    gateway.refresh_subject("job_posting", job_id)

The factory (get_gateway) reads the RECOMMENDER_MODE flag and returns:
    - local      → LocalRecommendationAdapter
    - standalone → StandaloneRecommendationAdapter (with local fallback)
    - shadow     → ShadowRecommendationAdapter (runs both, serves local)
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import List, Optional

from sqlmodel import Session

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# DTOs (plain dicts kept simple for now; typed dataclasses if needed later)
# ──────────────────────────────────────────────────────────────────────────────

# CandidateRankItem schema (returned by rank_candidates_for_job):
#   {
#     candidate_id, job_profile_id, name, email, location,
#     experience, match_percent, match_details, match_quality,
#     already_swiped, already_matched, is_mutual_match,
#     skills, profile_name, job_role, worktype, salary_range
#   }

# JobRankItem schema (returned by rank_jobs_for_profile):
#   {
#     job_id, job_title, company_name, match_percent, match_quality,
#     match_details, already_applied
#   }


# ──────────────────────────────────────────────────────────────────────────────
# Abstract gateway
# ──────────────────────────────────────────────────────────────────────────────

class RecommendationGateway(ABC):
    """
    Abstract interface for recommendation operations.

    Concrete implementations must not import each other; they are
    selected by get_gateway() based on the feature flag.
    """

    @abstractmethod
    def rank_candidates_for_job(
        self,
        job_id: int,
        company_id: int,
        session: Session,
        min_score: int = 35,
        limit: int = 100,
    ) -> List[dict]:
        """Return ranked candidates for a job posting."""

    @abstractmethod
    def rank_jobs_for_profile(
        self,
        job_profile_id: int,
        candidate_id: int,
        session: Session,
        min_score: int = 35,
        limit: int = 50,
    ) -> List[dict]:
        """Return ranked job postings for a candidate job profile."""

    @abstractmethod
    def explain_pair(
        self,
        job_id: int,
        job_profile_id: int,
        session: Session,
    ) -> dict:
        """Return detailed match breakdown for a (job, profile) pair."""

    @abstractmethod
    def record_feedback(
        self,
        job_id: int,
        job_profile_id: int,
        candidate_id: int,
        company_id: int,
        actor_user_id: int,
        signal: str,
        score_at_feedback: Optional[int],
        rec_session: Session,
    ) -> None:
        """Persist a recruiter or candidate feedback signal."""

    @abstractmethod
    def refresh_subject(self, entity_type: str, entity_id: int) -> None:
        """
        Trigger an immediate sync for a specific entity (e.g. after an update).
        Implementation may be a no-op for the local adapter.
        """

    @property
    def adapter_name(self) -> str:
        return self.__class__.__name__


# ──────────────────────────────────────────────────────────────────────────────
# Factory
# ──────────────────────────────────────────────────────────────────────────────

def get_gateway() -> RecommendationGateway:
    """
    Return the active RecommendationGateway based on feature flags.

    Intentionally imported lazily to avoid circular imports at module load time.
    """
    from app.core.feature_flags import flags, RecommenderMode

    if not flags.recommender_enabled:
        # Fast-path: feature is disabled, always use local adapter
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter
        return LocalRecommendationAdapter()

    mode = flags.recommender_mode

    if mode == RecommenderMode.LOCAL:
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter
        return LocalRecommendationAdapter()

    if mode == RecommenderMode.STANDALONE:
        from app.recommender.adapters.standalone_adapter import StandaloneRecommendationAdapter
        return StandaloneRecommendationAdapter()

    if mode == RecommenderMode.SHADOW:
        from app.recommender.adapters.shadow_adapter import ShadowRecommendationAdapter
        return ShadowRecommendationAdapter()

    # Unknown mode — fall back to local and warn
    logger.warning(f"[GATEWAY] Unknown RECOMMENDER_MODE '{mode}' — falling back to local adapter")
    from app.recommender.adapters.local_adapter import LocalRecommendationAdapter
    return LocalRecommendationAdapter()
