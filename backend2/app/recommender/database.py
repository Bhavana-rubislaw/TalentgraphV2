"""
Dual-database session management for the recommender subsystem.

The recommender package manages its own SQLAlchemy engine and session factory
so that recommender queries never contend with core-DB connection pool slots,
and the two schemas can be deployed to separate PostgreSQL instances when needed.

Usage (FastAPI dependency):

    from app.recommender.database import get_recommender_session

    @router.get("/...")
    def my_endpoint(rec_session: Session = Depends(get_recommender_session)):
        ...

Usage (background worker):

    from app.recommender.database import recommender_engine
    with Session(recommender_engine) as session:
        ...

Health check:

    from app.recommender.database import check_recommender_db_health
    ok, detail = check_recommender_db_health()
"""

from __future__ import annotations

import logging
import os
from typing import Generator, Tuple

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlmodel import Session, SQLModel

logger = logging.getLogger(__name__)

load_dotenv()

# ──────────────────────────────────────────────────────────────────────────────
# Engine
# ──────────────────────────────────────────────────────────────────────────────

_RECOMMENDER_DATABASE_URL = os.getenv(
    "RECOMMENDER_DATABASE_URL",
    # Fall back to core DB in local development so no extra Postgres instance is required
    os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/talentgraph_recommender"),
)

recommender_engine = create_engine(
    _RECOMMENDER_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=int(os.getenv("RECOMMENDER_DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("RECOMMENDER_DB_POOL_OVERFLOW", "10")),
    echo=False,
)


# ──────────────────────────────────────────────────────────────────────────────
# Table initialisation
# ──────────────────────────────────────────────────────────────────────────────

def init_recommender_db() -> None:
    """
    Create all recommender-owned tables if they don't already exist.

    Safe to call on every startup — SQLModel's create_all is idempotent.
    """
    from app.recommender.models import (  # noqa: F401 — import needed for metadata registration
        RecommendationAlgorithmConfig,
        RecommendationScoreCache,
        RecommendationFeedback,
        RecommendationRunMetrics,
        RecommendationFeatureSnapshot,
        RecommendationSyncWatermark,
    )

    SQLModel.metadata.create_all(recommender_engine)
    logger.info("[RECOMMENDER-DB] Schema initialised successfully")

    # Seed default algorithm config if none exists
    _ensure_default_algorithm_config()


def _ensure_default_algorithm_config() -> None:
    """Insert the default v1.0.0 algorithm config if the table is empty."""
    from app.recommender.models import (
        RecommendationAlgorithmConfig,
        AlgorithmStatus,
    )
    from datetime import datetime

    with Session(recommender_engine) as session:
        from sqlmodel import select

        existing = session.exec(
            select(RecommendationAlgorithmConfig).where(
                RecommendationAlgorithmConfig.status == AlgorithmStatus.ACTIVE
            )
        ).first()

        if existing is None:
            default_config = RecommendationAlgorithmConfig(
                version="1.0.0",
                status=AlgorithmStatus.ACTIVE,
                weight_product_match=40,
                weight_skills_match=30,
                weight_experience_match=15,
                weight_salary_match=10,
                weight_location_match=5,
                description="Default algorithm — mirrors original in-process scoring weights",
                activated_at=datetime.utcnow(),
            )
            session.add(default_config)
            session.commit()
            logger.info("[RECOMMENDER-DB] Default algorithm config v1.0.0 inserted")


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI dependency
# ──────────────────────────────────────────────────────────────────────────────

def get_recommender_session() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a recommender DB session."""
    with Session(recommender_engine) as session:
        yield session


# ──────────────────────────────────────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────────────────────────────────────

def check_recommender_db_health() -> Tuple[bool, str]:
    """
    Execute a lightweight connectivity probe.

    Returns:
        (True, "ok") on success
        (False, error_message) on failure
    """
    try:
        with recommender_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "ok"
    except OperationalError as exc:
        logger.warning(f"[RECOMMENDER-DB] Health check failed: {exc}")
        return False, str(exc)
