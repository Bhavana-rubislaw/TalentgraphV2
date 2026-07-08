"""
Migration: Create recommender schema

Category: MIGRATION
Idempotent: YES (create_all + conditional inserts)
Rollback: YES (--rollback flag drops all recommender tables)
Dependencies: None (operates on RECOMMENDER_DATABASE_URL, separate from core DB)
Risk Level: LOW

Usage:
    # Apply (idempotent)
    python scripts/migrations/create_recommender_schema.py

    # Rollback (destructive — drops all recommender tables)
    python scripts/migrations/create_recommender_schema.py --rollback
"""

from __future__ import annotations

import sys
import logging
from pathlib import Path

# Allow running from the backend2 root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlmodel import SQLModel, Session, select, text
from app.recommender.database import recommender_engine
from app.recommender.models import (
    RecommendationAlgorithmConfig,
    RecommendationScoreCache,
    RecommendationFeedback,
    RecommendationRunMetrics,
    RecommendationFeatureSnapshot,
    RecommendationSyncWatermark,
    AlgorithmStatus,
)
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

TABLES = [
    "recommendation_sync_watermark",
    "recommendation_feature_snapshot",
    "recommendation_run_metrics",
    "recommendation_feedback",
    "recommendation_score_cache",
    "recommendation_algorithm_config",
]


def apply() -> None:
    """Create all recommender tables and seed default config."""
    logger.info("Applying recommender schema migration...")

    # Create tables (idempotent)
    SQLModel.metadata.create_all(recommender_engine)
    logger.info("  [OK] Tables created (or already exist)")

    # Seed default algorithm config if missing
    with Session(recommender_engine) as session:
        existing = session.exec(
            select(RecommendationAlgorithmConfig).where(
                RecommendationAlgorithmConfig.status == AlgorithmStatus.ACTIVE
            )
        ).first()

        if not existing:
            config = RecommendationAlgorithmConfig(
                version="1.0.0",
                status=AlgorithmStatus.ACTIVE,
                weight_product_match=40,
                weight_skills_match=30,
                weight_experience_match=15,
                weight_salary_match=10,
                weight_location_match=5,
                description="Default — mirrors original in-process scoring weights",
                activated_at=datetime.utcnow(),
            )
            session.add(config)
            session.commit()
            logger.info("  [OK] Default algorithm config v1.0.0 inserted")
        else:
            logger.info(f"  [SKIP] Active algorithm config already exists: v{existing.version}")

    logger.info("Migration applied successfully.")


def rollback() -> None:
    """Drop all recommender tables (destructive — last resort)."""
    logger.warning("Rolling back recommender schema — this is destructive!")
    with recommender_engine.connect() as conn:
        for table in TABLES:
            conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            logger.info(f"  [DROPPED] {table}")
        conn.commit()
    logger.info("Rollback complete.")


if __name__ == "__main__":
    if "--rollback" in sys.argv:
        confirm = input("Type 'yes' to confirm rollback (drops all recommender tables): ")
        if confirm.strip().lower() == "yes":
            rollback()
        else:
            print("Rollback cancelled.")
    else:
        apply()
