"""
Admin: Recommendation algorithm configuration and operational controls.

Routes:
    GET    /api/admin/recommendations/config             — list all configs
    GET    /api/admin/recommendations/config/{id}        — get single config
    POST   /api/admin/recommendations/config             — create draft config
    PUT    /api/admin/recommendations/config/{id}/activate — promote to active
    PUT    /api/admin/recommendations/config/{id}/archive  — archive config
    GET    /api/admin/recommendations/metrics            — recent run metrics
    GET    /api/admin/recommendations/watermarks         — sync watermark status
    POST   /api/admin/recommendations/backfill           — trigger manual backfill
    GET    /api/admin/recommendations/health             — gateway + db health
    GET    /api/admin/recommendations/flags              — current feature flags
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.recommender.database import get_recommender_session
from app.recommender.models import (
    AlgorithmStatus,
    RecommendationAlgorithmConfig,
    RecommendationRunMetrics,
    RecommendationSyncWatermark,
)
from app.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin/recommendations",
    tags=["Admin: Recommendations"],
)


# ──────────────────────────────────────────────────────────────────────────────
# Auth guard (admin only)
# ──────────────────────────────────────────────────────────────────────────────

def _require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ──────────────────────────────────────────────────────────────────────────────
# Request schemas
# ──────────────────────────────────────────────────────────────────────────────

class CreateConfigRequest(BaseModel):
    version: str
    description: Optional[str] = None
    weight_product_match: int = Field(default=40, ge=0, le=100)
    weight_skills_match: int = Field(default=30, ge=0, le=100)
    weight_experience_match: int = Field(default=15, ge=0, le=100)
    weight_salary_match: int = Field(default=10, ge=0, le=100)
    weight_location_match: int = Field(default=5, ge=0, le=100)


# ──────────────────────────────────────────────────────────────────────────────
# Algorithm config endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/config")
def list_configs(
    _admin=Depends(_require_admin),
    rec_session: Session = Depends(get_recommender_session),
):
    """List all algorithm configs ordered by creation date descending."""
    configs = rec_session.exec(
        select(RecommendationAlgorithmConfig)
        .order_by(RecommendationAlgorithmConfig.created_at.desc())
    ).all()
    return {"configs": [_config_to_dict(c) for c in configs]}


@router.get("/config/{config_id}")
def get_config(
    config_id: int,
    _admin=Depends(_require_admin),
    rec_session: Session = Depends(get_recommender_session),
):
    config = rec_session.get(RecommendationAlgorithmConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return _config_to_dict(config)


@router.post("/config", status_code=status.HTTP_201_CREATED)
def create_config(
    body: CreateConfigRequest,
    current_user: dict = Depends(_require_admin),
    rec_session: Session = Depends(get_recommender_session),
):
    """Create a new DRAFT algorithm config.  Weights need not sum to 100."""
    # Validate unique version
    existing = rec_session.exec(
        select(RecommendationAlgorithmConfig).where(
            RecommendationAlgorithmConfig.version == body.version
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"Version '{body.version}' already exists"
        )

    config = RecommendationAlgorithmConfig(
        version=body.version,
        status=AlgorithmStatus.DRAFT,
        weight_product_match=body.weight_product_match,
        weight_skills_match=body.weight_skills_match,
        weight_experience_match=body.weight_experience_match,
        weight_salary_match=body.weight_salary_match,
        weight_location_match=body.weight_location_match,
        description=body.description,
    )
    rec_session.add(config)
    rec_session.commit()
    rec_session.refresh(config)
    return _config_to_dict(config)


@router.put("/config/{config_id}/activate")
def activate_config(
    config_id: int,
    current_user: dict = Depends(_require_admin),
    rec_session: Session = Depends(get_recommender_session),
):
    """
    Promote a DRAFT config to ACTIVE.

    Archives the currently active config first to ensure only one is active.
    """
    target = rec_session.get(RecommendationAlgorithmConfig, config_id)
    if not target:
        raise HTTPException(status_code=404, detail="Config not found")
    if target.status == AlgorithmStatus.ARCHIVED:
        raise HTTPException(status_code=409, detail="Cannot activate an archived config")

    # Archive current active
    current_active = rec_session.exec(
        select(RecommendationAlgorithmConfig).where(
            RecommendationAlgorithmConfig.status == AlgorithmStatus.ACTIVE
        )
    ).first()
    if current_active and current_active.id != config_id:
        current_active.status = AlgorithmStatus.ARCHIVED
        current_active.archived_at = datetime.utcnow()
        rec_session.add(current_active)

    target.status = AlgorithmStatus.ACTIVE
    target.activated_at = datetime.utcnow()
    target.activated_by_user_id = current_user.get("user_id")
    rec_session.add(target)
    rec_session.commit()
    rec_session.refresh(target)

    logger.info(
        f"[ADMIN-RECS] Algorithm config v{target.version} activated "
        f"by user {current_user.get('email')}"
    )
    return _config_to_dict(target)


@router.put("/config/{config_id}/archive")
def archive_config(
    config_id: int,
    _admin=Depends(_require_admin),
    rec_session: Session = Depends(get_recommender_session),
):
    config = rec_session.get(RecommendationAlgorithmConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    if config.status == AlgorithmStatus.ACTIVE:
        raise HTTPException(
            status_code=409,
            detail="Cannot archive the active config. Activate another config first.",
        )
    config.status = AlgorithmStatus.ARCHIVED
    config.archived_at = datetime.utcnow()
    rec_session.add(config)
    rec_session.commit()
    return {"archived": True, "config_id": config_id}


# ──────────────────────────────────────────────────────────────────────────────
# Operational endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/metrics")
def get_run_metrics(
    limit: int = 50,
    _admin=Depends(_require_admin),
    rec_session: Session = Depends(get_recommender_session),
):
    """Return the most recent recommendation run metrics."""
    metrics = rec_session.exec(
        select(RecommendationRunMetrics)
        .order_by(RecommendationRunMetrics.started_at.desc())
        .limit(limit)
    ).all()
    return {
        "metrics": [
            {
                "id": m.id,
                "run_type": m.run_type,
                "started_at": m.started_at.isoformat(),
                "finished_at": m.finished_at.isoformat() if m.finished_at else None,
                "duration_ms": m.duration_ms,
                "records_processed": m.records_processed,
                "records_updated": m.records_updated,
                "records_failed": m.records_failed,
                "error_message": m.error_message,
            }
            for m in metrics
        ]
    }


@router.get("/watermarks")
def get_watermarks(
    _admin=Depends(_require_admin),
    rec_session: Session = Depends(get_recommender_session),
):
    """Return current sync watermark positions."""
    watermarks = rec_session.exec(select(RecommendationSyncWatermark)).all()
    return {
        "watermarks": [
            {
                "entity_type": w.entity_type,
                "last_synced_at": w.last_synced_at.isoformat(),
                "last_run_at": w.last_run_at.isoformat(),
                "records_synced_last_run": w.records_synced_last_run,
            }
            for w in watermarks
        ]
    }


@router.post("/backfill", status_code=status.HTTP_202_ACCEPTED)
def trigger_backfill(_admin=Depends(_require_admin)):
    """
    Trigger a manual backfill in a background thread.

    Returns 202 immediately; monitor progress via /metrics.
    """
    import threading
    from app.workers.recommendation_worker import run_backfill

    threading.Thread(target=run_backfill, daemon=True).start()
    logger.info("[ADMIN-RECS] Manual backfill triggered")
    return {"status": "accepted", "message": "Backfill started — monitor via /metrics"}


@router.get("/health")
def get_health(_admin=Depends(_require_admin)):
    """Return gateway adapter name, recommender DB status, and feature flags."""
    from app.core.feature_flags import flags
    from app.recommender.database import check_recommender_db_health
    from app.recommender.gateway import get_gateway

    db_ok, db_detail = check_recommender_db_health()
    gateway = get_gateway()

    return {
        "gateway_adapter": gateway.adapter_name,
        "recommender_db": "ok" if db_ok else f"degraded: {db_detail}",
        "feature_flags": flags.as_dict(),
    }


@router.get("/flags")
def get_flags(_admin=Depends(_require_admin)):
    """Return the current feature flag values for the recommender subsystem."""
    from app.core.feature_flags import flags
    return flags.as_dict()


# ──────────────────────────────────────────────────────────────────────────────
# Serialisation helpers
# ──────────────────────────────────────────────────────────────────────────────

def _config_to_dict(config: RecommendationAlgorithmConfig) -> dict:
    return {
        "id": config.id,
        "version": config.version,
        "status": config.status.value,
        "weight_product_match": config.weight_product_match,
        "weight_skills_match": config.weight_skills_match,
        "weight_experience_match": config.weight_experience_match,
        "weight_salary_match": config.weight_salary_match,
        "weight_location_match": config.weight_location_match,
        "description": config.description,
        "created_at": config.created_at.isoformat(),
        "activated_at": config.activated_at.isoformat() if config.activated_at else None,
        "activated_by_user_id": config.activated_by_user_id,
        "archived_at": config.archived_at.isoformat() if config.archived_at else None,
    }
