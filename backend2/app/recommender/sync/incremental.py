"""
Incremental sync worker: keeps feature snapshots fresh after the initial backfill.

Reads only rows modified since the last watermark checkpoint, so the worker
runs cheaply on a short interval without re-processing the entire dataset.

Key guarantees:
- Idempotent: re-running from the same watermark produces the same result.
- Fault-tolerant: per-row try/except; failed rows are counted and retried next run.
- Watermark advances only after successful batch commit.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from app.database import engine as core_engine
from app.models import (
    JobPosting,
    JobPostingStatus,
    JobProfile,
    Skill,
    Candidate,
)
from app.recommender.database import recommender_engine
from app.recommender.models import (
    RecommendationFeatureSnapshot,
    RecommendationRunMetrics,
    RecommendationScoreCache,
    RecommendationSyncWatermark,
)

logger = logging.getLogger(__name__)

_EPOCH = datetime(2020, 1, 1)  # Fallback watermark for first run without backfill


class IncrementalSyncWorker:
    """
    Fetches rows modified after the stored watermark and upserts their
    feature snapshots, then marks dependent score-cache entries as stale.
    """

    BATCH_SIZE = 200

    def run(self) -> dict:
        run_metric = RecommendationRunMetrics(
            run_type="incremental_sync", started_at=datetime.utcnow()
        )
        with Session(recommender_engine) as s:
            s.add(run_metric)
            s.commit()
            s.refresh(run_metric)
            run_id = run_metric.id

        total_processed = total_updated = total_failed = 0

        try:
            jp_p, jp_u, jp_f = self._sync_entity_type("job_profile")
            post_p, post_u, post_f = self._sync_entity_type("job_posting")
            total_processed = jp_p + post_p
            total_updated = jp_u + post_u
            total_failed = jp_f + post_f
        except Exception as exc:
            logger.error(f"[INCREMENTAL-SYNC] Fatal: {exc}", exc_info=True)
            self._finish_run_metric(run_id, total_processed, total_updated, total_failed, str(exc))
            raise

        self._finish_run_metric(run_id, total_processed, total_updated, total_failed)
        summary = {
            "run_type": "incremental_sync",
            "processed": total_processed,
            "updated": total_updated,
            "failed": total_failed,
        }
        logger.info(f"[INCREMENTAL-SYNC] Done: {summary}")
        return summary

    # ──────────────────────────────────────────────────────────────

    def _sync_entity_type(self, entity_type: str):
        watermark = self._get_watermark(entity_type)
        processed = updated = failed = 0

        if entity_type == "job_profile":
            rows = self._fetch_updated_job_profiles(watermark)
        else:
            rows = self._fetch_updated_job_postings(watermark)

        if not rows:
            logger.debug(f"[INCREMENTAL-SYNC] No updates for {entity_type} since {watermark}")
            return 0, 0, 0

        new_watermark = watermark
        with Session(recommender_engine) as rec_session:
            for row in rows:
                processed += 1
                try:
                    features = (
                        self._extract_job_profile_features(row)
                        if entity_type == "job_profile"
                        else self._extract_job_posting_features(row)
                    )
                    row_ts = getattr(row, "updated_at", None) or getattr(row, "created_at", None) or datetime.utcnow()
                    self._upsert_snapshot(rec_session, entity_type, row.id, row, features, row_ts)
                    self._mark_scores_stale(rec_session, entity_type, row.id)
                    if row_ts > new_watermark:
                        new_watermark = row_ts
                    updated += 1
                except Exception as exc:
                    logger.warning(f"[INCREMENTAL-SYNC] {entity_type} {row.id} failed: {exc}")
                    failed += 1

            rec_session.commit()

        if new_watermark > watermark:
            self._update_watermark(entity_type, new_watermark, processed)

        return processed, updated, failed

    def _get_watermark(self, entity_type: str) -> datetime:
        with Session(recommender_engine) as session:
            wm = session.exec(
                select(RecommendationSyncWatermark).where(
                    RecommendationSyncWatermark.entity_type == entity_type
                )
            ).first()
            return wm.last_synced_at if wm else _EPOCH

    def _fetch_updated_job_profiles(self, since: datetime):
        with Session(core_engine) as session:
            return session.exec(
                select(JobProfile)
                .where(
                    (JobProfile.updated_at > since) | (JobProfile.created_at > since)
                )
                .limit(self.BATCH_SIZE)
            ).all()

    def _fetch_updated_job_postings(self, since: datetime):
        with Session(core_engine) as session:
            return session.exec(
                select(JobPosting)
                .where(
                    JobPosting.status.in_([JobPostingStatus.ACTIVE, JobPostingStatus.REPOSTED])
                )
                .where(
                    (JobPosting.updated_at > since) | (JobPosting.created_at > since)
                )
                .limit(self.BATCH_SIZE)
            ).all()

    def _extract_job_profile_features(self, profile: JobProfile) -> dict:
        with Session(core_engine) as session:
            skills = session.exec(
                select(Skill).where(Skill.job_profile_id == profile.id)
            ).all()
            candidate = session.get(Candidate, profile.candidate_id)
        return {
            "profile_name": profile.profile_name,
            "job_role": profile.job_role,
            "product_vendor": profile.product_vendor,
            "product_type": profile.product_type,
            "years_of_experience": profile.years_of_experience,
            "salary_min": float(profile.salary_min) if profile.salary_min else None,
            "salary_max": float(profile.salary_max) if profile.salary_max else None,
            "worktype": profile.worktype.value if profile.worktype else None,
            "skills": [s.skill_name for s in skills],
            "candidate_name": candidate.name if candidate else None,
            "candidate_email": candidate.email if candidate else None,
            "location_state": candidate.location_state if candidate else None,
        }

    def _extract_job_posting_features(self, posting: JobPosting) -> dict:
        return {
            "job_title": posting.job_title,
            "job_role": posting.job_role,
            "product_vendor": posting.product_vendor,
            "product_type": posting.product_type,
            "seniority_level": posting.seniority_level,
            "required_skills": posting.required_skills,
            "salary_min": float(posting.salary_min) if posting.salary_min else None,
            "salary_max": float(posting.salary_max) if posting.salary_max else None,
            "location": posting.location,
            "worktype": posting.worktype,
        }

    def _upsert_snapshot(
        self,
        session: Session,
        entity_type: str,
        entity_id: int,
        row,
        features: dict,
        core_updated_at: datetime,
    ) -> None:
        existing = session.exec(
            select(RecommendationFeatureSnapshot)
            .where(RecommendationFeatureSnapshot.entity_type == entity_type)
            .where(RecommendationFeatureSnapshot.entity_id == entity_id)
        ).first()

        if existing:
            existing.features = json.dumps(features)
            existing.core_db_updated_at = core_updated_at
            existing.snapshot_taken_at = datetime.utcnow()
            existing.is_active = True
            session.add(existing)
        else:
            candidate_id = getattr(row, "candidate_id", None)
            company_id = getattr(row, "company_id", None)
            session.add(
                RecommendationFeatureSnapshot(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    candidate_id=candidate_id,
                    company_id=company_id,
                    features=json.dumps(features),
                    core_db_updated_at=core_updated_at,
                )
            )

    def _mark_scores_stale(
        self, session: Session, entity_type: str, entity_id: int
    ) -> None:
        """Mark pre-computed scores as stale so they are recomputed next request."""
        if entity_type == "job_profile":
            scores = session.exec(
                select(RecommendationScoreCache).where(
                    RecommendationScoreCache.job_profile_id == entity_id
                )
            ).all()
        else:
            scores = session.exec(
                select(RecommendationScoreCache).where(
                    RecommendationScoreCache.job_posting_id == entity_id
                )
            ).all()

        for score in scores:
            score.is_stale = True
            session.add(score)

    def _update_watermark(
        self, entity_type: str, last_synced_at: datetime, records: int
    ) -> None:
        with Session(recommender_engine) as session:
            existing = session.exec(
                select(RecommendationSyncWatermark).where(
                    RecommendationSyncWatermark.entity_type == entity_type
                )
            ).first()
            if existing:
                existing.last_synced_at = last_synced_at
                existing.last_run_at = datetime.utcnow()
                existing.records_synced_last_run = records
                session.add(existing)
            else:
                session.add(
                    RecommendationSyncWatermark(
                        entity_type=entity_type,
                        last_synced_at=last_synced_at,
                        records_synced_last_run=records,
                    )
                )
            session.commit()

    def _finish_run_metric(
        self,
        run_id: int,
        processed: int,
        updated: int,
        failed: int,
        error: Optional[str] = None,
    ) -> None:
        finished_at = datetime.utcnow()
        with Session(recommender_engine) as session:
            metric = session.get(RecommendationRunMetrics, run_id)
            if metric:
                metric.finished_at = finished_at
                metric.duration_ms = int(
                    (finished_at - metric.started_at).total_seconds() * 1000
                )
                metric.records_processed = processed
                metric.records_updated = updated
                metric.records_failed = failed
                metric.error_message = error
                session.add(metric)
                session.commit()
