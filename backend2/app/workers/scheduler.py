"""
Worker Scheduler for TalentGraph
=================================
APScheduler configuration for background workers

Workers:
- lifecycle_worker: Daily at 2 AM UTC
- analytics_worker: Daily at 3 AM UTC  
- reminder_worker: Hourly

Usage:
    from app.workers.scheduler import start_workers
    start_workers()
"""

import logging
import os
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from app.workers.lifecycle_worker import LifecycleWorker
from app.workers.analytics_worker import AnalyticsWorker
from app.workers.reminder_worker import ReminderWorker

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


# ═══════════════════════════════════════════════════════════════════════════
# SCHEDULER SETUP
# ═══════════════════════════════════════════════════════════════════════════

def job_listener(event):
    """
    Listen to job execution events for logging
    """
    if event.exception:
        logger.error(f"Job {event.job_id} failed: {event.exception}")
    else:
        logger.info(f"Job {event.job_id} executed successfully")


def start_workers():
    """
    Start background worker scheduler
    
    Should be called on application startup
    """
    global scheduler
    
    if scheduler is not None:
        logger.warning("Scheduler already started")
        return
    
    logger.info("Starting worker scheduler")
    
    # Create scheduler
    scheduler = BackgroundScheduler(
        timezone="UTC",
        job_defaults={
            'coalesce': True,  # Combine missed executions
            'max_instances': 1,  # Only one instance per job
            'misfire_grace_time': 3600  # Allow 1 hour grace for missed jobs
        }
    )
    
    # Add event listener
    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)
    
    # Initialize workers
    lifecycle_worker = LifecycleWorker()
    analytics_worker = AnalyticsWorker()
    reminder_worker = ReminderWorker()
    
    # ═════════════════════════════════════════════════════════════════════
    # LIFECYCLE WORKER - Daily at 2 AM UTC
    # ═════════════════════════════════════════════════════════════════════
    
    scheduler.add_job(
        func=lifecycle_worker.run,
        trigger=CronTrigger(hour=2, minute=0, timezone="UTC"),
        id='lifecycle_worker',
        name='Daily Lifecycle Checks',
        replace_existing=True
    )
    
    logger.info("Scheduled: lifecycle_worker (daily at 2 AM UTC)")
    
    # ═════════════════════════════════════════════════════════════════════
    # ANALYTICS WORKER - Daily at 3 AM UTC
    # ═════════════════════════════════════════════════════════════════════
    
    scheduler.add_job(
        func=analytics_worker.run,
        trigger=CronTrigger(hour=3, minute=0, timezone="UTC"),
        id='analytics_worker',
        name='Daily Analytics Aggregation',
        replace_existing=True
    )
    
    logger.info("Scheduled: analytics_worker (daily at 3 AM UTC)")
    
    # ═════════════════════════════════════════════════════════════════════
    # REMINDER WORKER - Hourly
    # ═════════════════════════════════════════════════════════════════════
    
    scheduler.add_job(
        func=reminder_worker.run,
        trigger=IntervalTrigger(hours=1, timezone="UTC"),
        id='reminder_worker',
        name='Interview Reminders',
        replace_existing=True
    )
    
    logger.info("Scheduled: reminder_worker (hourly)")
    
    # ═════════════════════════════════════════════════════════════════════
    # START SCHEDULER
    # ═════════════════════════════════════════════════════════════════════
    
    scheduler.start()
    
    logger.info("✓ Worker scheduler started successfully")
    
    # Log next execution times
    jobs = scheduler.get_jobs()
    for job in jobs:
        logger.info(f"  {job.name}: next run at {job.next_run_time}")


def stop_workers():
    """
    Stop background worker scheduler
    
    Should be called on application shutdown
    """
    global scheduler
    
    if scheduler is None:
        return
    
    logger.info("Stopping worker scheduler")
    
    scheduler.shutdown(wait=True)
    scheduler = None
    
    logger.info("✓ Worker scheduler stopped")


def get_scheduler_status():
    """
    Get scheduler status and job information
    
    Returns:
        Dictionary with scheduler state and job details
    """
    global scheduler
    
    if scheduler is None:
        return {
            "running": False,
            "jobs": []
        }
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })
    
    return {
        "running": scheduler.running,
        "jobs": jobs
    }


def trigger_job_now(job_id: str):
    """
    Manually trigger a job to run immediately
    
    Args:
        job_id: Job identifier (lifecycle_worker, analytics_worker, reminder_worker)
    
    Raises:
        ValueError: If job not found
    """
    global scheduler
    
    if scheduler is None:
        raise ValueError("Scheduler not started")
    
    try:
        job = scheduler.get_job(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")
        
        # Run job immediately
        job.modify(next_run_time=datetime.now(timezone.utc))
        
        logger.info(f"Triggered job {job_id} to run now")
        
    except Exception as e:
        logger.error(f"Failed to trigger job {job_id}: {e}")
        raise


# ═══════════════════════════════════════════════════════════════════════════
# DEVELOPMENT HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def run_worker_once(worker_name: str):
    """
    Run a single worker immediately (for testing)
    
    Args:
        worker_name: lifecycle, analytics, or reminder
    """
    
    logger.info(f"Running {worker_name} worker once")
    
    if worker_name == "lifecycle":
        worker = LifecycleWorker()
        worker.run()
    elif worker_name == "analytics":
        worker = AnalyticsWorker()
        worker.run()
    elif worker_name == "reminder":
        worker = ReminderWorker()
        worker.run()
    else:
        raise ValueError(f"Unknown worker: {worker_name}")
    
    logger.info(f"Completed {worker_name} worker")


# ═══════════════════════════════════════════════════════════════════════════
# GRACEFUL SHUTDOWN
# ═══════════════════════════════════════════════════════════════════════════

import atexit
import signal

def setup_graceful_shutdown():
    """
    Setup graceful shutdown handlers
    
    Ensures workers complete before process terminates
    """
    
    def shutdown_handler(signum, frame):
        logger.info(f"Received signal {signum}, shutting down gracefully")
        stop_workers()
    
    # Register signal handlers
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)
    
    # Register atexit handler
    atexit.register(stop_workers)
    
    logger.info("Registered graceful shutdown handlers")


# ═══════════════════════════════════════════════════════════════════════════
# INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════

# Setup graceful shutdown on module import
setup_graceful_shutdown()
