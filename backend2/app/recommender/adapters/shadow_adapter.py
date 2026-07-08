"""
Shadow recommendation adapter — runs both local and standalone in parallel,
serves the local result to users, and persists drift metrics for analysis.

Used when RECOMMENDER_MODE=shadow.
"""

from __future__ import annotations

import logging
import threading
from typing import List, Optional

from sqlmodel import Session

from app.recommender.gateway import RecommendationGateway

logger = logging.getLogger(__name__)


class ShadowRecommendationAdapter(RecommendationGateway):
    """
    Runs both local and standalone adapters concurrently.

    - User-facing response: always the local adapter result.
    - Shadow computation: standalone adapter runs in a background thread.
    - Drift metrics: written to RecommendationRunMetrics when
      RECOMMENDER_SHADOW_COMPARE=true.

    This design ensures shadow mode has zero latency impact on user requests.
    """

    def __init__(self) -> None:
        from app.recommender.adapters.local_adapter import LocalRecommendationAdapter
        from app.recommender.adapters.standalone_adapter import StandaloneRecommendationAdapter
        from app.core.feature_flags import flags

        self._local = LocalRecommendationAdapter()
        self._standalone = StandaloneRecommendationAdapter()
        self._record_drift = flags.recommender_shadow_compare

    def rank_candidates_for_job(
        self,
        job_id: int,
        company_id: int,
        session: Session,
        min_score: int = 35,
        limit: int = 100,
    ) -> List[dict]:
        local_result = self._local.rank_candidates_for_job(
            job_id, company_id, session, min_score, limit
        )

        if self._record_drift:
            threading.Thread(
                target=self._shadow_rank_candidates,
                args=(job_id, company_id, min_score, limit, local_result),
                daemon=True,
            ).start()

        return local_result

    def rank_jobs_for_profile(
        self,
        job_profile_id: int,
        candidate_id: int,
        session: Session,
        min_score: int = 35,
        limit: int = 50,
    ) -> List[dict]:
        local_result = self._local.rank_jobs_for_profile(
            job_profile_id, candidate_id, session, min_score, limit
        )

        if self._record_drift:
            threading.Thread(
                target=self._shadow_rank_jobs,
                args=(job_profile_id, candidate_id, min_score, limit, local_result),
                daemon=True,
            ).start()

        return local_result

    def explain_pair(self, job_id: int, job_profile_id: int, session: Session) -> dict:
        result = self._local.explain_pair(job_id, job_profile_id, session)
        result["shadow_mode"] = True
        return result

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
        self._local.record_feedback(
            job_id, job_profile_id, candidate_id, company_id,
            actor_user_id, signal, score_at_feedback, rec_session,
        )

    def refresh_subject(self, entity_type: str, entity_id: int) -> None:
        self._standalone.refresh_subject(entity_type, entity_id)

    # ──────────────────────────────────────────────────────────────
    # Shadow comparison helpers (run in background threads)
    # ──────────────────────────────────────────────────────────────

    def _shadow_rank_candidates(
        self,
        job_id: int,
        company_id: int,
        min_score: int,
        limit: int,
        local_result: List[dict],
    ) -> None:
        """Fire-and-forget: compare standalone result with local and store drift."""
        try:
            from sqlmodel import Session
            from app.database import engine as core_engine

            with Session(core_engine) as session:
                standalone_result = self._standalone.rank_candidates_for_job(
                    job_id, company_id, session, min_score, limit
                )

            self._persist_drift_metric(
                context=f"rank_candidates_for_job:job={job_id}",
                local_result=local_result,
                standalone_result=standalone_result,
            )
        except Exception as exc:
            logger.debug(f"[SHADOW] shadow_rank_candidates failed (non-fatal): {exc}")

    def _shadow_rank_jobs(
        self,
        job_profile_id: int,
        candidate_id: int,
        min_score: int,
        limit: int,
        local_result: List[dict],
    ) -> None:
        try:
            from sqlmodel import Session
            from app.database import engine as core_engine

            with Session(core_engine) as session:
                standalone_result = self._standalone.rank_jobs_for_profile(
                    job_profile_id, candidate_id, session, min_score, limit
                )

            self._persist_drift_metric(
                context=f"rank_jobs_for_profile:profile={job_profile_id}",
                local_result=local_result,
                standalone_result=standalone_result,
            )
        except Exception as exc:
            logger.debug(f"[SHADOW] shadow_rank_jobs failed (non-fatal): {exc}")

    def _persist_drift_metric(
        self, context: str, local_result: List[dict], standalone_result: List[dict]
    ) -> None:
        """Write a RecommendationRunMetrics row capturing list-level drift."""
        try:
            from datetime import datetime
            from app.recommender.database import recommender_engine
            from app.recommender.models import RecommendationRunMetrics
            from sqlmodel import Session

            local_ids = {r.get("candidate_id") or r.get("job_id") for r in local_result}
            standalone_ids = {r.get("candidate_id") or r.get("job_id") for r in standalone_result}
            overlap = len(local_ids & standalone_ids)
            drift_count = len(local_ids.symmetric_difference(standalone_ids))

            metric = RecommendationRunMetrics(
                run_type=f"shadow_compare:{context}",
                started_at=datetime.utcnow(),
                finished_at=datetime.utcnow(),
                duration_ms=0,
                records_processed=len(local_result),
                records_updated=overlap,
                records_failed=drift_count,
                error_message=f"drift={drift_count} overlap={overlap} "
                              f"local={len(local_result)} standalone={len(standalone_result)}",
            )

            with Session(recommender_engine) as session:
                session.add(metric)
                session.commit()
        except Exception as exc:
            logger.debug(f"[SHADOW] persist_drift_metric failed (non-fatal): {exc}")
