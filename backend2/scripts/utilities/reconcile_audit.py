"""
Reconciliation script: compares recent operational changes vs activityevent rows.

For each entity type, checks the last N operational records and verifies
a corresponding ActivityEvent exists. Logs mismatches.

Run on-demand or as a scheduled job:
    python reconcile_audit.py [--limit 100]
"""
import sys
import os
import argparse
sys.path.insert(0, os.path.dirname(__file__))

import logging
from datetime import datetime, timedelta
from sqlalchemy import text
from app.database import engine

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


CHECKS = [
    {
        "label": "Applications without audit event",
        "query": """
            SELECT a.id, a.candidate_id, a.job_posting_id, a.status, a.applied_at
            FROM application a
            WHERE a.applied_at >= :since
              AND NOT EXISTS (
                  SELECT 1 FROM activityevent ae
                  WHERE ae.entity_type = 'application'
                    AND ae.entity_id   = a.id::text
                    AND ae.action      = 'created'
              )
            ORDER BY a.applied_at DESC
            LIMIT :limit
        """,
    },
    {
        "label": "Swipes without audit event",
        "query": """
            SELECT s.id, s.candidate_id, s.company_id, s.action, s.action_by, s.created_at
            FROM swipe s
            WHERE s.created_at >= :since
              AND NOT EXISTS (
                  SELECT 1 FROM activityevent ae
                  WHERE ae.entity_type = 'swipe'
                    AND ae.entity_id   = s.id::text
              )
            ORDER BY s.created_at DESC
            LIMIT :limit
        """,
    },
]


def run(limit: int = 100, lookback_hours: int = 24):
    since = datetime.utcnow() - timedelta(hours=lookback_hours)
    total_mismatches = 0

    with engine.connect() as conn:
        for check in CHECKS:
            rows = conn.execute(
                text(check["query"]),
                {"since": since, "limit": limit},
            ).fetchall()
            if rows:
                logger.warning("[RECONCILE] %s — %d mismatch(es):", check["label"], len(rows))
                for r in rows:
                    logger.warning("  %s", dict(r._mapping))
                total_mismatches += len(rows)
            else:
                logger.info("[RECONCILE] %s — OK", check["label"])

    if total_mismatches:
        logger.warning("[RECONCILE] Total mismatches: %d", total_mismatches)
        sys.exit(1)
    else:
        logger.info("[RECONCILE] All checks passed — no orphan events found.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--lookback-hours", type=int, default=24)
    args = parser.parse_args()
    run(limit=args.limit, lookback_hours=args.lookback_hours)
