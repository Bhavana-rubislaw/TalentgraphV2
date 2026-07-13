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
from app.middleware.rate_limiting import setup_rate_limiting
from app.core.logging_config import setup_logging, get_logger, log_change
from app.core.router_registration import register_api_routers
from app.services.startup_service import (
    init_recommender_if_enabled,
    start_workers_if_enabled,
    init_email_scheduler,
    recover_orphaned_emails,
    run_lifecycle_checks_if_enabled,
    stop_workers_if_started,
)
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

    init_recommender_if_enabled(logger)
    workers_enabled = start_workers_if_enabled(logger)
    init_email_scheduler(logger)
    recover_orphaned_emails(logger)
    run_lifecycle_checks_if_enabled(logger)
    
    yield
    
    # Shutdown
    logger.info("[SHUTDOWN] TalentGraph V2 API shutting down...")
    stop_workers_if_started(logger, workers_enabled)


app = FastAPI(
    title="TalentGraph V2 API",
    description="Candidate-centric talent marketplace",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration - Restrictive for production security
register_api_routers(app, logger, log_change)
limiter = setup_rate_limiting(app)

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
    """Health check endpoint — reports core DB and recommender DB status."""
    from app.core.feature_flags import flags

    result: dict = {"status": "ok", "core_db": "ok"}

    if flags.recommender_enabled:
        try:
            from app.recommender.database import check_recommender_db_health
            ok, detail = check_recommender_db_health()
            result["recommender_db"] = "ok" if ok else f"degraded: {detail}"
            result["recommender_mode"] = flags.recommender_mode.value
        except Exception as exc:
            result["recommender_db"] = f"error: {exc}"
    else:
        result["recommender_db"] = "disabled"

    return result


# ============ ROUTERS ============
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8001,
        reload=True
    )


