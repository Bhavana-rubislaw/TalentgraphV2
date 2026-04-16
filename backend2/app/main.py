"""
FastAPI main application for TalentGraph V2
Runs on port 8001
"""

import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from app.database import init_db
from app.middleware.request_id import RequestIdMiddleware
from app.core.logging_config import setup_logging, get_logger, log_change
import os
from pathlib import Path

# Load environment variables from .env file (look in backend2 root directory)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configure enhanced logging system
setup_logging()
logger = get_logger(__name__)

# Initialize database on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("[STARTUP] TalentGraph V2 API starting...")
    init_db()
    logger.info("[STARTUP] Database initialized successfully")
    
    # Start background workers if enabled
    workers_enabled = os.getenv("WORKERS_ENABLED", "true").lower() == "true"
    if workers_enabled:
        try:
            from app.workers import start_workers
            start_workers()
            logger.info("[STARTUP] Background workers started successfully")
        except Exception as e:
            logger.warning(f"[STARTUP] Failed to start workers: {e}")
    else:
        logger.info("[STARTUP] Background workers disabled (WORKERS_ENABLED=false)")
    
    # Run lifecycle checks immediately on startup
    lifecycle_enabled = os.getenv("LIFECYCLE_CHECK_ON_STARTUP", "true").lower() == "true"
    if lifecycle_enabled:
        try:
            from app.services.lifecycle_service import LifecycleService
            from app.database import engine
            from sqlmodel import Session
            
            logger.info("[STARTUP] Running lifecycle checks...")
            with Session(engine) as session:
                lifecycle = LifecycleService()
                
                # Check expiring jobs (3-day warnings to recruiters)
                expiring_3day = lifecycle.check_expiring_jobs(session, warning_days=3)
                logger.info(f"[STARTUP] Sent {expiring_3day} 3-day expiry warnings")
                
                # Check expiring jobs (1-day URGENT warnings to Admin/HR)
                expiring_1day = lifecycle.check_expiring_jobs(session, warning_days=1)
                logger.info(f"[STARTUP] Sent {expiring_1day} urgent 1-day warnings (Admin/HR)")
                
                # Auto-freeze expired jobs
                frozen_count = lifecycle.auto_freeze_expired_jobs(session)
                logger.info(f"[STARTUP] Auto-frozen jobs: {frozen_count} jobs closed")
                
            logger.info("[STARTUP] Lifecycle checks completed")
        except Exception as e:
            logger.error(f"[STARTUP] Lifecycle checks failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("[SHUTDOWN] TalentGraph V2 API shutting down...")
    if workers_enabled:
        try:
            from app.workers import stop_workers
            stop_workers()
            logger.info("[SHUTDOWN] Background workers stopped successfully")
        except Exception as e:
            logger.warning(f"[SHUTDOWN] Failed to stop workers: {e}")


app = FastAPI(
    title="TalentGraph V2 API",
    description="Candidate-centric talent marketplace",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
]

# # Optional env override: FRONTEND_ORIGINS="http://localhost:3002,https://app.example.com"
frontend_origins_env = os.getenv("FRONTEND_ORIGINS", "").strip()
origins = [
    origin.strip() for origin in frontend_origins_env.split(",") if origin.strip()
] or default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Keep Local-dev flexible across localhost ports/protocols
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"],
    max_age=3600,
)

logger.info(f"[STARTUP] CORS origins configured: %s", origins)
# Request-ID tracing — must be added AFTER CORSMiddleware
app.add_middleware(RequestIdMiddleware)

# Change tracking middleware for comprehensive logging
from app.middleware.change_tracking import ChangeTrackingMiddleware
app.add_middleware(ChangeTrackingMiddleware)


# ============ ROOT ============

@app.get("/", tags=["Health"])
def root():
    """API health check"""
    logger.info("[HEALTH] Root endpoint accessed")
    return {
        "message": "TalentGraph V2 API",
        "version": "2.0.0",
        "status": "running",
        "docs": "http://localhost:8001/docs"
    }


@app.get("/health", tags=["Health"])
def health():
    """Health check endpoint"""
    return {"status": "ok"}


# ============ ROUTERS ============
from app.routers import (
    auth, candidates, company, job_postings, matches, recommendations, 
    swipes, dashboard, applications, notifications, activity_feed, 
    messages, meetings, calendar, analytics, logs
)

log_change(
    logger, 
    action="startup", 
    entity_type="application", 
    message="Registering API routers"
)

# Core routers
app.include_router(auth.router)
app.include_router(candidates.router)
app.include_router(company.router)
app.include_router(job_postings.router)
app.include_router(matches.router)
app.include_router(recommendations.router)
app.include_router(swipes.router)
app.include_router(dashboard.router)
app.include_router(applications.router)
app.include_router(notifications.router)
app.include_router(activity_feed.router)
app.include_router(messages.router)  # Direct messaging system
app.include_router(meetings.router)  # Meeting scheduler with email notifications
app.include_router(calendar.router)  # Calendar & video provider OAuth integration
app.include_router(analytics.router)  # Analytics & funnel metrics (no external deps)
app.include_router(logs.router)  # Comprehensive logging system

log_change(
    logger,
    action="startup_complete",
    entity_type="application",
    message="All routers registered successfully"
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8001,
        reload=True
    )

