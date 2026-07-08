"""
Recommender domain models — owned exclusively by the recommender package.

These tables live in the recommender database (RECOMMENDER_DATABASE_URL).
They are never imported by the core app models to avoid cross-schema coupling.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


# ──────────────────────────────────────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────────────────────────────────────

class AlgorithmStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class FeedbackSignal(str, enum.Enum):
    LIKED = "liked"
    DISMISSED = "dismissed"
    SHORTLISTED = "shortlisted"
    APPLIED = "applied"
    HIRED = "hired"


# ──────────────────────────────────────────────────────────────────────────────
# Algorithm configuration (versioned)
# ──────────────────────────────────────────────────────────────────────────────

class RecommendationAlgorithmConfig(SQLModel, table=True):
    """
    Versioned, admin-managed algorithm weight configuration.

    Only one row may have status=ACTIVE at a time.  The gateway always reads
    the active config; the admin API handles version promotion / rollback.
    """

    __tablename__ = "recommendation_algorithm_config"

    id: Optional[int] = Field(default=None, primary_key=True)
    version: str = Field(index=True, description="Semantic version string e.g. '1.2.0'")
    status: AlgorithmStatus = Field(default=AlgorithmStatus.DRAFT, index=True)

    # Scoring weights — must sum to 100
    weight_product_match: int = Field(default=40, ge=0, le=100)
    weight_skills_match: int = Field(default=30, ge=0, le=100)
    weight_experience_match: int = Field(default=15, ge=0, le=100)
    weight_salary_match: int = Field(default=10, ge=0, le=100)
    weight_location_match: int = Field(default=5, ge=0, le=100)

    # Metadata
    description: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    activated_at: Optional[datetime] = Field(default=None)
    activated_by_user_id: Optional[int] = Field(default=None)
    archived_at: Optional[datetime] = Field(default=None)


# ──────────────────────────────────────────────────────────────────────────────
# Pre-computed score cache
# ──────────────────────────────────────────────────────────────────────────────

class RecommendationScoreCache(SQLModel, table=True):
    """
    Pre-computed match score for a (job_posting_id, job_profile_id) pair.

    Populated by the backfill worker and kept fresh by the incremental sync.
    Allows the gateway to skip expensive in-request scoring when cache is warm.
    """

    __tablename__ = "recommendation_score_cache"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_posting_id: int = Field(index=True)
    job_profile_id: int = Field(index=True)
    candidate_id: int = Field(index=True)
    company_id: int = Field(index=True)

    score: int = Field(ge=0, le=100)
    match_quality: str  # Gold / Silver / Bronze
    score_details: Optional[str] = Field(default=None)  # JSON blob

    algorithm_config_id: int = Field(foreign_key="recommendation_algorithm_config.id")
    computed_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    is_stale: bool = Field(default=False, index=True)  # Marked true by sync on change


# ──────────────────────────────────────────────────────────────────────────────
# Recruiter feedback signals
# ──────────────────────────────────────────────────────────────────────────────

class RecommendationFeedback(SQLModel, table=True):
    """
    Records recruiter or candidate interactions with recommendations.

    Used for offline analysis of scoring quality and future model training.
    """

    __tablename__ = "recommendation_feedback"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_posting_id: int = Field(index=True)
    job_profile_id: int = Field(index=True)
    candidate_id: int = Field(index=True)
    company_id: int = Field(index=True)
    actor_user_id: int  # who performed the action
    signal: FeedbackSignal
    score_at_feedback: Optional[int] = Field(default=None)  # score shown to actor
    recorded_at: datetime = Field(default_factory=datetime.utcnow, index=True)


# ──────────────────────────────────────────────────────────────────────────────
# Run metrics (one row per scoring run)
# ──────────────────────────────────────────────────────────────────────────────

class RecommendationRunMetrics(SQLModel, table=True):
    """
    Operational metrics for each scoring / sync run.

    Surfaced on the admin Algorithm page for SLO monitoring.
    """

    __tablename__ = "recommendation_run_metrics"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_type: str  # "backfill" | "incremental_sync" | "on_demand"
    started_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    finished_at: Optional[datetime] = Field(default=None)
    duration_ms: Optional[int] = Field(default=None)
    records_processed: int = Field(default=0)
    records_updated: int = Field(default=0)
    records_failed: int = Field(default=0)
    error_message: Optional[str] = Field(default=None)
    algorithm_config_id: Optional[int] = Field(
        default=None, foreign_key="recommendation_algorithm_config.id"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Feature snapshots (denormalised entity data for scoring)
# ──────────────────────────────────────────────────────────────────────────────

class RecommendationFeatureSnapshot(SQLModel, table=True):
    """
    Snapshot of the core-DB entities needed for scoring.

    Populated from the core DB during sync so scoring queries never hit
    the core DB directly (only the recommender DB).  Updated incrementally
    via watermark tracking.
    """

    __tablename__ = "recommendation_feature_snapshot"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: str = Field(index=True)   # "job_profile" | "job_posting"
    entity_id: int = Field(index=True)     # PK in core DB
    company_id: Optional[int] = Field(default=None, index=True)
    candidate_id: Optional[int] = Field(default=None, index=True)

    # Denormalised fields stored as JSON
    features: str  # JSON blob of scoring-relevant attributes

    core_db_updated_at: datetime  # source entity's updated_at / created_at
    snapshot_taken_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    is_active: bool = Field(default=True, index=True)


# ──────────────────────────────────────────────────────────────────────────────
# Sync watermark (tracks incremental sync progress)
# ──────────────────────────────────────────────────────────────────────────────

class RecommendationSyncWatermark(SQLModel, table=True):
    """
    Tracks the highest-observed `updated_at` timestamp per entity type.

    The incremental sync worker reads this to know where to resume after
    a crash or restart, ensuring exactly-once processing semantics.
    """

    __tablename__ = "recommendation_sync_watermark"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: str = Field(unique=True, index=True)  # "job_profile" | "job_posting"
    last_synced_at: datetime
    last_run_at: datetime = Field(default_factory=datetime.utcnow)
    records_synced_last_run: int = Field(default=0)
