"""
Backfill worker: initial population of RecommendationFeatureSnapshot.

Reads all active JobProfile and JobPosting rows from the core DB and writes
denormalised feature snapshots to the recommender DB.  Safe to re-run;
existing snapshots are updated (upsert by entity_type + entity_id).

Usage:
    from app.recommender.sync.backfill import BackfillWorker
    result = BackfillWorker().run()
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from app.database import engine as core_engine
from app.models import (
    Candidate,
    Company,
    JobPosting,
    JobPostingStatus,
    JobProfile,
    Skill,
)
from app.recommender.database import recommender_engine
from app.recommender.models import (
    RecommendationFeatureSnapshot,
    RecommendationRunMetrics,
    RecommendationSyncWatermark,
)

logger = logging.getLogger(__name__)


class BackfillWorker:
    """
    Reads all scoreable entities from the core DB and populates feature
    snapshots in the recommender DB.

    Design notes:
    - Processes in batches of BATCH_SIZE to avoid OOM on large datasets.
    - Upserts by (entity_type, entity_id) so re-runs are idempotent.
    - Writes a RecommendationRunMetrics row on completion.
    """

    BATCH_SIZE = 500

    def run(self) -> dict:
        """Execute full backfill.  Returns summary dict."""
        run_metric = RecommendationRunMetrics(run_type="backfill", started_at=datetime.utcnow())

        with Session(recommender_engine) as rec_session:
            rec_session.add(run_metric)
            rec_session.commit()
            rec_session.refresh(run_metric)
            run_id = run_metric.id

        total_processed = 0
        total_updated = 0
        total_failed = 0

        try:
            jp_processed, jp_updated, jp_failed = self._backfill_job_profiles()
            post_processed, post_updated, post_failed = self._backfill_job_postings()

            total_processed = jp_processed + post_processed
            total_updated = jp_updated + post_updated
            total_failed = jp_failed + post_failed

        except Exception as exc:
            logger.error(f"[BACKFILL] Fatal error: {exc}", exc_info=True)
            self._finish_run_metric(run_id, total_processed, total_updated, total_failed, str(exc))
            raise

        self._finish_run_metric(run_id, total_processed, total_updated, total_failed)
        summary = {
            "run_type": "backfill",
            "processed": total_processed,
            "updated": total_updated,
            "failed": total_failed,
        }
        logger.info(f"[BACKFILL] Completed: {summary}")
        return summary

    # ──────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────

    def _backfill_job_profiles(self):
        processed = updated = failed = 0
        offset = 0

        while True:
            with Session(core_engine) as core_session:
                profiles = core_session.exec(
                    select(JobProfile).offset(offset).limit(self.BATCH_SIZE)
                ).all()

            if not profiles:
                break

            with Session(recommender_engine) as rec_session:
                for profile in profiles:
                    try:
                        features = self._extract_job_profile_features(profile)
                        self._upsert_snapshot(
                            rec_session,
                            entity_type="job_profile",
                            entity_id=profile.id,
                            candidate_id=profile.candidate_id,
                            company_id=None,
                            features=features,
                            core_updated_at=profile.updated_at or profile.created_at or datetime.utcnow(),
                        )
                        updated += 1
                    except Exception as exc:
                        logger.warning(f"[BACKFILL] job_profile {profile.id} failed: {exc}")
                        failed += 1
                    processed += 1

                rec_session.commit()

            # Update watermark after each batch
            self._update_watermark(
                "job_profile",
                max(
                    p.updated_at or p.created_at or datetime.utcnow()
                    for p in profiles
                ),
                len(profiles),
            )
            offset += self.BATCH_SIZE

        return processed, updated, failed

    def _backfill_job_postings(self):
        processed = updated = failed = 0
        offset = 0

        while True:
            with Session(core_engine) as core_session:
                postings = core_session.exec(
                    select(JobPosting)
                    .where(JobPosting.status.in_([
                        JobPostingStatus.ACTIVE,
                        JobPostingStatus.REPOSTED,
                    ]))
                    .offset(offset)
                    .limit(self.BATCH_SIZE)
                ).all()

            if not postings:
                break

            with Session(recommender_engine) as rec_session:
                for posting in postings:
                    try:
                        features = self._extract_job_posting_features(posting)
                        self._upsert_snapshot(
                            rec_session,
                            entity_type="job_posting",
                            entity_id=posting.id,
                            candidate_id=None,
                            company_id=posting.company_id,
                            features=features,
                            core_updated_at=posting.updated_at or posting.created_at or datetime.utcnow(),
                        )
                        updated += 1
                    except Exception as exc:
                        logger.warning(f"[BACKFILL] job_posting {posting.id} failed: {exc}")
                        failed += 1
                    processed += 1

                rec_session.commit()

            self._update_watermark(
                "job_posting",
                max(
                    p.updated_at or p.created_at or datetime.utcnow()
                    for p in postings
                ),
                len(postings),
            )
            offset += self.BATCH_SIZE

        return processed, updated, failed

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
            "seniority_level": profile.seniority_level,
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
            "required_skills": posting.required_skills,  # stored as JSON string
            "salary_min": float(posting.salary_min) if posting.salary_min else None,
            "salary_max": float(posting.salary_max) if posting.salary_max else None,
            "location": posting.location,
            "worktype": posting.worktype,
            "status": posting.status.value if posting.status else None,
        }

    def _upsert_snapshot(
        self,
        session: Session,
        entity_type: str,
        entity_id: int,
        candidate_id: Optional[int],
        company_id: Optional[int],
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
            snapshot = RecommendationFeatureSnapshot(
                entity_type=entity_type,
                entity_id=entity_id,
                candidate_id=candidate_id,
                company_id=company_id,
                features=json.dumps(features),
                core_db_updated_at=core_updated_at,
            )
            session.add(snapshot)

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
                if last_synced_at > existing.last_synced_at:
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
