"""
Startup orchestration helpers for TalentGraph API.

This module keeps startup/shutdown side effects out of app.main so boot logic
is easier to test and maintain without changing runtime behavior.
"""

import os


def init_recommender_if_enabled(logger) -> None:
    recommender_enabled = os.getenv("RECOMMENDER_ENABLED", "true").lower() == "true"
    if recommender_enabled:
        try:
            from app.recommender.database import init_recommender_db

            init_recommender_db()
            logger.info("[STARTUP] recommender_db_initialized")
        except Exception as e:
            logger.warning("[STARTUP] recommender_db_init_failed error=%s", e)


def start_workers_if_enabled(logger) -> bool:
    workers_enabled = os.getenv("WORKERS_ENABLED", "true").lower() == "true"
    if workers_enabled:
        try:
            from app.workers import start_workers

            start_workers()
            logger.info("[STARTUP] workers_started")
        except Exception as e:
            logger.warning("[STARTUP] workers_start_failed error=%s", e)
    else:
        logger.info("[STARTUP] workers_disabled reason=WORKERS_ENABLED=false")
    return workers_enabled


def init_email_scheduler(logger) -> None:
    try:
        from app.workers.email_worker import get_email_scheduler

        get_email_scheduler()  # Creates scheduler with polling fallback
        logger.info("[STARTUP] email_scheduler_initialized")
    except Exception as e:
        logger.warning("[STARTUP] email_scheduler_init_failed error=%s", e)


def recover_orphaned_emails(logger) -> None:
    try:
        from datetime import datetime, timedelta

        from apscheduler.triggers.date import DateTrigger
        from sqlmodel import Session, select

        from app.database import engine
        from app.models import EmailDelivery, EmailDeliveryStatus
        from app.workers.email_worker import send_notification_email_task, get_email_scheduler

        with Session(engine) as session:
            orphaned = session.exec(
                select(EmailDelivery).where(
                    EmailDelivery.status == EmailDeliveryStatus.QUEUED.value,
                    EmailDelivery.attempts < EmailDelivery.max_attempts,
                )
            ).all()

            if orphaned:
                scheduler = get_email_scheduler()
                for i, delivery in enumerate(orphaned):
                    # Stagger jobs by 2s each to avoid all firing simultaneously.
                    run_at = datetime.utcnow() + timedelta(seconds=5 + i * 2)
                    scheduler.add_job(
                        send_notification_email_task,
                        trigger=DateTrigger(run_date=run_at),
                        args=[delivery.id],
                        id=f"email_recover_{delivery.id}",
                        replace_existing=True,
                    )
                logger.info("[STARTUP] orphaned_emails_requeued count=%s", len(orphaned))
            else:
                logger.info("[STARTUP] orphaned_emails_none_found")
    except Exception as e:
        logger.warning("[STARTUP] orphaned_email_recovery_failed error=%s", e)


def run_lifecycle_checks_if_enabled(logger) -> None:
    lifecycle_enabled = os.getenv("LIFECYCLE_CHECK_ON_STARTUP", "true").lower() == "true"
    if lifecycle_enabled:
        try:
            from sqlmodel import Session

            from app.database import engine
            from app.services.lifecycle_service import LifecycleService

            logger.info("[STARTUP] lifecycle_checks_started")
            with Session(engine) as session:
                lifecycle = LifecycleService()

                # Check expiring jobs (3-day warnings to recruiters)
                expiring_3day = lifecycle.check_expiring_jobs(session, warning_days=3)
                logger.info("[STARTUP] expiry_warnings_sent warning_days=3 count=%s", expiring_3day)

                # Check expiring jobs (1-day URGENT warnings to Admin/HR)
                expiring_1day = lifecycle.check_expiring_jobs(session, warning_days=1)
                logger.info("[STARTUP] expiry_warnings_sent warning_days=1 urgent=True count=%s", expiring_1day)

                # Auto-freeze expired jobs
                frozen_count = lifecycle.auto_freeze_expired_jobs(session)
                logger.info("[STARTUP] jobs_auto_frozen count=%s", frozen_count)

            logger.info("[STARTUP] lifecycle_checks_completed")
        except Exception as e:
            logger.error("[STARTUP] lifecycle_checks_failed error=%s", e)


def stop_workers_if_started(logger, workers_enabled: bool) -> None:
    if workers_enabled:
        try:
            from app.workers import stop_workers

            stop_workers()
            logger.info("[SHUTDOWN] workers_stopped")
        except Exception as e:
            logger.warning("[SHUTDOWN] workers_stop_failed error=%s", e)
