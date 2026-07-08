"""
Observability helpers for the recommender subsystem.

Provides structured log emission and SLO metric helpers used across
the gateway, adapters, and admin router to produce a consistent
observability surface.

Usage:
    from app.recommender.observability import obs

    obs.log_ranking_request(adapter_name, job_id, result_count, latency_ms)
    obs.log_fallback(adapter_name, reason, context)
    obs.log_sync_run(run_type, processed, updated, failed, duration_ms)
"""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Generator

logger = logging.getLogger("recommender.observability")


class RecommenderObservability:
    """
    Structured log helpers for the recommender subsystem.

    All methods emit JSON-friendly key=value log lines so that log
    aggregation tools (Datadog, CloudWatch, Loki) can parse them as
    structured fields without additional parsers.
    """

    # SLO thresholds
    LATENCY_WARN_MS = 300
    LATENCY_CRITICAL_MS = 800
    FALLBACK_WARN_THRESHOLD = 3  # log WARN after N fallbacks in one process lifetime

    def __init__(self) -> None:
        self._fallback_count = 0

    @contextmanager
    def timed_operation(self, operation: str) -> Generator[dict, None, None]:
        """
        Context manager that measures wall-clock time and returns a result
        carrier dict.  Callers populate 'result' before the context exits.

        Example:
            with obs.timed_operation("rank_candidates") as ctx:
                ctx["result"] = gateway.rank_candidates_for_job(...)
            latency = ctx["latency_ms"]
        """
        ctx: dict = {"operation": operation, "latency_ms": 0}
        start = time.perf_counter()
        try:
            yield ctx
        finally:
            ctx["latency_ms"] = int((time.perf_counter() - start) * 1000)
            self._emit_latency(operation, ctx["latency_ms"])

    def log_ranking_request(
        self,
        adapter_name: str,
        context_key: str,
        context_value: int,
        result_count: int,
        latency_ms: int,
    ) -> None:
        level = logging.WARNING if latency_ms > self.LATENCY_WARN_MS else logging.INFO
        logger.log(
            level,
            f"[RECS] ranking_complete "
            f"adapter={adapter_name} {context_key}={context_value} "
            f"results={result_count} latency_ms={latency_ms}",
        )

    def log_fallback(self, adapter_name: str, reason: str, context: str) -> None:
        self._fallback_count += 1
        logger.warning(
            f"[RECS] fallback_triggered "
            f"adapter={adapter_name} reason={reason} context={context} "
            f"total_fallbacks_this_process={self._fallback_count}"
        )

    def log_sync_run(
        self,
        run_type: str,
        processed: int,
        updated: int,
        failed: int,
        duration_ms: int,
        error: str | None = None,
    ) -> None:
        level = logging.ERROR if failed > 0 else logging.INFO
        logger.log(
            level,
            f"[RECS] sync_run_complete "
            f"run_type={run_type} processed={processed} updated={updated} "
            f"failed={failed} duration_ms={duration_ms}"
            + (f" error={error}" if error else ""),
        )

    def log_gateway_health(
        self,
        adapter_name: str,
        db_ok: bool,
        db_detail: str,
    ) -> None:
        level = logging.WARNING if not db_ok else logging.DEBUG
        logger.log(
            level,
            f"[RECS] gateway_health adapter={adapter_name} "
            f"db_ok={db_ok} db_detail={db_detail}",
        )

    def _emit_latency(self, operation: str, latency_ms: int) -> None:
        if latency_ms > self.LATENCY_CRITICAL_MS:
            logger.error(
                f"[RECS] high_latency operation={operation} latency_ms={latency_ms} "
                f"threshold={self.LATENCY_CRITICAL_MS}"
            )
        elif latency_ms > self.LATENCY_WARN_MS:
            logger.warning(
                f"[RECS] slow_operation operation={operation} latency_ms={latency_ms} "
                f"threshold={self.LATENCY_WARN_MS}"
            )


# Singleton used across the recommender package
obs = RecommenderObservability()
