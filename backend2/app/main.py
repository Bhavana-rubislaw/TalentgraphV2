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
import os
from pathlib import Path

# Load environment variables from .env file (look in backend2 root directory)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('talentgraph_v2.log')
    ]
)
logger = logging.getLogger(__name__)

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
origins = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Request-ID tracing — must be added AFTER CORSMiddleware
app.add_middleware(RequestIdMiddleware)


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
    messages, meetings, calendar, analytics
)

logger.info("[STARTUP] Registering routers...")

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

# Phase 3 & 4 routers (conditional based on feature flags)
attachments_enabled = os.getenv("FEATURE_ATTACHMENTS_ENABLED", "false").lower() == "true"
email_threading_enabled = os.getenv("FEATURE_EMAIL_THREADING_ENABLED", "false").lower() == "true"
billing_enabled = os.getenv("FEATURE_BILLING_ENABLED", "false").lower() == "true"

if attachments_enabled:
    try:
        from app.routers import attachments
        app.include_router(attachments.router)
        logger.info("[STARTUP] Attachments router registered (S3 enabled)")
    except Exception as e:
        logger.warning(f"[STARTUP] Failed to load attachments router: {e}")

if email_threading_enabled:
    try:
        from app.routers import email_webhooks
        app.include_router(email_webhooks.router)
        logger.info("[STARTUP] Email webhooks router registered")
    except Exception as e:
        logger.warning(f"[STARTUP] Failed to load email_webhooks router: {e}")

if billing_enabled:
    try:
        from app.routers import billing
        app.include_router(billing.router)
        logger.info("[STARTUP] Billing router registered (Stripe enabled)")
    except Exception as e:
        logger.warning(f"[STARTUP] Failed to load billing router: {e}")

logger.info("[STARTUP] All routers registered successfully")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8001,
        reload=True
    )

