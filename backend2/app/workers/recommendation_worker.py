"""
Background worker: schedules backfill and incremental sync jobs via APScheduler.

Registered in app/workers/scheduler.py when RECOMMENDER_WORKERS_ENABLED=true.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def run_backfill() -> None:
    """APScheduler job entry-point: initial / forced backfill."""
    from app.recommender.sync.backfill import BackfillWorker
    try:
        result = BackfillWorker().run()
        logger.info(f"[RECOMMENDER-WORKER] Backfill finished: {result}")
    except Exception as exc:
        logger.error(f"[RECOMMENDER-WORKER] Backfill failed: {exc}", exc_info=True)


def run_incremental_sync() -> None:
    """APScheduler job entry-point: incremental sync (runs every 15 minutes)."""
    from app.recommender.sync.incremental import IncrementalSyncWorker
    try:
        result = IncrementalSyncWorker().run()
        logger.info(f"[RECOMMENDER-WORKER] Incremental sync finished: {result}")
    except Exception as exc:
        logger.error(f"[RECOMMENDER-WORKER] Incremental sync failed: {exc}", exc_info=True)
