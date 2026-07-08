"""
Standalone recommendation adapter — delegates scoring to a remote service.

Calls RECOMMENDER_SERVICE_URL via HTTP with a configurable timeout.
On timeout or connection error, falls back to the local adapter automatically
and records a traceable reason code.

This adapter is used when RECOMMENDER_MODE=standalone.
"""

from __future__ import annotations

import logging
from typing import List, Optional

import httpx
from sqlmodel import Session

from app.core.feature_flags import flags
from app.recommender.gateway import RecommendationGateway

logger = logging.getLogger(__name__)

_FALLBACK_REASON_TIMEOUT = "standalone_timeout"
_FALLBACK_REASON_ERROR = "standalone_error"
_FALLBACK_REASON_UNAVAILABLE = "standalone_unavailable"


class StandaloneRecommendationAdapter(RecommendationGateway):
    """
    Delegates to the remote recommender service.

    Falls back to LocalRecommendationAdapter on any transport failure and
    logs a structured warning with the reason code so operators can detect
    degraded-mode operation via log queries or metrics.
    """

    def __init__(self) -> None:
        self._base_url = __import__("os").getenv(
            "RECOMMENDER_SERVICE_URL", "http://localhost:8010"
        )
        self._timeout = flags.recommender_timeout_seconds

    # ──────────────────────────────────────────────────────────────
    # Public interface
    # ──────────────────────────────────────────────────────────────

    def rank_candidates_for_job(
        self,
        job_id: int,
        company_id: int,
        session: Session,
        min_score: int = 35,
        limit: int = 100,
    ) -> List[dict]:
        try:
            resp = httpx.get(
                f"{self._base_url}/v1/rank/candidates",
                params={"job_id": job_id, "company_id": company_id, "min_score": min_score, "limit": limit},
                timeout=self._timeout,
            )
            resp.raise_for_status()
            return resp.json().get("candidates", [])
        except httpx.TimeoutException:
            return self._fallback_rank_candidates(
                job_id, company_id, session, min_score, limit, _FALLBACK_REASON_TIMEOUT
            )
        except Exception as exc:
            return self._fallback_rank_candidates(
                job_id, company_id, session, min_score, limit,
                f"{_FALLBACK_REASON_ERROR}: {exc}",
            )

    def rank_jobs_for_profile(
        self,
        job_profile_id: int,
        candidate_id: int,
        session: Session,
        min_score: int = 35,
        limit: int = 50,
    ) -> List[dict]:
        try:
            resp = httpx.get(
                f"{self._base_url}/v1/rank/jobs",
                params={"job_profile_id": job_profile_id, "candidate_id": candidate_id,
                        "min_score": min_score, "limit": limit},
                timeout=self._timeout,
            )
            resp.raise_for_status()
            return resp.json().get("jobs", [])
        except httpx.TimeoutException:
            return self._fallback_rank_jobs(
                job_profile_id, candidate_id, session, min_score, limit, _FALLBACK_REASON_TIMEOUT
            )
        except Exception as exc:
            return self._fallback_rank_jobs(
                job_profile_id, candidate_id, session, min_score, limit,
                f"{_FALLBACK_REASON_ERROR}: {exc}",
            )

    def explain_pair(self, job_id: int, job_profile_id: int, session: Session) -> dict:
        try:
            resp = httpx.get(
                f"{self._base_url}/v1/explain",
                params={"job_id": job_id, "job_profile_id": job_profile_id},
                timeout=self._timeout,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.warning(
                f"[STANDALONE-ADAPTER] explain_pair fallback. reason={_FALLBACK_REASON_ERROR} exc={exc}"
            )
            return self._local().explain_pair(job_id, job_profile_id, session)

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
        # Always persist feedback locally regardless of remote status
        self._local().record_feedback(
            job_id, job_profile_id, candidate_id, company_id,
            actor_user_id, signal, score_at_feedback, rec_session,
        )

    def refresh_subject(self, entity_type: str, entity_id: int) -> None:
        try:
            httpx.post(
                f"{self._base_url}/v1/refresh",
                json={"entity_type": entity_type, "entity_id": entity_id},
                timeout=self._timeout,
            )
        except Exception as exc:
            logger.debug(f"[STANDALONE-ADAPTER] refresh_subject failed (non-fatal): {exc}")

    # ──────────────────────────────────────────────────────────────
    # Fallback helpers
    # ──────────────────────────────────────────────────────────────

    def _local(self):
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter
        return LocalRecommendationAdapter()

    def _fallback_rank_candidates(
        self, job_id, company_id, session, min_score, limit, reason
    ) -> List[dict]:
        logger.warning(
            f"[STANDALONE-ADAPTER] rank_candidates_for_job falling back to local. "
            f"job_id={job_id} reason={reason}"
        )
        return self._local().rank_candidates_for_job(
            job_id, company_id, session, min_score, limit
        )

    def _fallback_rank_jobs(
        self, job_profile_id, candidate_id, session, min_score, limit, reason
    ) -> List[dict]:
        logger.warning(
            f"[STANDALONE-ADAPTER] rank_jobs_for_profile falling back to local. "
            f"job_profile_id={job_profile_id} reason={reason}"
        )
        return self._local().rank_jobs_for_profile(
            job_profile_id, candidate_id, session, min_score, limit
        )
