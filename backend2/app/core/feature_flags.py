"""
Feature flag evaluation for TalentGraph V2.

All flags are read from environment variables with safe defaults so that
the application behaves identically to the pre-extraction baseline when no
flags are explicitly configured.

Usage:
    from app.core.feature_flags import flags

    if flags.recommender_enabled:
        ...
    if flags.recommender_mode == RecommenderMode.SHADOW:
        ...
"""

from __future__ import annotations

import os
from enum import Enum


class RecommenderMode(str, Enum):
    LOCAL = "local"           # In-process scoring (legacy, default)
    STANDALONE = "standalone" # Remote recommender service
    SHADOW = "shadow"         # Run both; serve local; record drift


class FeatureFlags:
    """
    Thin wrapper around os.getenv for feature flag access.

    Values are read lazily so that tests can patch os.environ before
    the first access without any import-time side effects.
    """

    # ──────────────────────────────────────────────────────────────
    # Recommender subsystem
    # ──────────────────────────────────────────────────────────────

    @property
    def recommender_enabled(self) -> bool:
        """Master switch for the recommender subsystem."""
        return os.getenv("RECOMMENDER_ENABLED", "true").lower() == "true"

    @property
    def recommender_mode(self) -> RecommenderMode:
        """
        Controls which recommendation adapter is active.

        Accepted values: local | standalone | shadow
        Unknown values fall back to LOCAL to prevent silent breakage.
        """
        raw = os.getenv("RECOMMENDER_MODE", "local").lower().strip()
        try:
            return RecommenderMode(raw)
        except ValueError:
            return RecommenderMode.LOCAL

    @property
    def recommender_shadow_compare(self) -> bool:
        """
        When True (and mode is shadow), the gateway persists drift
        metrics to the recommender DB for later analysis.
        """
        return os.getenv("RECOMMENDER_SHADOW_COMPARE", "false").lower() == "true"

    @property
    def recommender_workers_enabled(self) -> bool:
        """
        Controls whether background sync/backfill workers run.
        Useful to disable syncing without touching the serving path.
        """
        return os.getenv("RECOMMENDER_WORKERS_ENABLED", "true").lower() == "true"

    @property
    def recommender_timeout_seconds(self) -> float:
        """Timeout for the remote standalone adapter call."""
        return float(os.getenv("RECOMMENDER_TIMEOUT_SECONDS", "2.0"))

    @property
    def recommender_min_score_threshold(self) -> int:
        """Minimum score to include a candidate in results (recruiter view)."""
        return int(os.getenv("RECOMMENDER_MIN_SCORE_THRESHOLD", "35"))

    # ──────────────────────────────────────────────────────────────
    # Helper for observability / health endpoints
    # ──────────────────────────────────────────────────────────────

    def as_dict(self) -> dict:
        """Serialisable snapshot of all flag values (safe for health endpoints)."""
        return {
            "recommender_enabled": self.recommender_enabled,
            "recommender_mode": self.recommender_mode.value,
            "recommender_shadow_compare": self.recommender_shadow_compare,
            "recommender_workers_enabled": self.recommender_workers_enabled,
            "recommender_timeout_seconds": self.recommender_timeout_seconds,
            "recommender_min_score_threshold": self.recommender_min_score_threshold,
        }


# Singleton used throughout the application
flags = FeatureFlags()
