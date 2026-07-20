"""
FastAPI main application for TalentGraph V2
Runs on port 8001
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from app.database import init_db
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.rate_limiting import setup_rate_limiting
from app.core.logging_config import setup_logging, get_logger, log_change
from app.core.router_registration import register_api_routers
from app.auth_constants import GENERIC_INPUT_ERROR
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
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
    "http://localhost:3004",
    "http://127.0.0.1:3004",
    "http://localhost:3005",
    "http://127.0.0.1:3005",
]

# Optional env override: FRONTEND_ORIGINS="http://localhost:3002,https://app.example.com"
frontend_origins_env = os.getenv("FRONTEND_ORIGINS", "").strip()
origins = [
    origin.strip() for origin in frontend_origins_env.split(",") if origin.strip()
] or default_origins

# Production environment check
is_production = os.getenv("APP_ENV", "development").lower() == "production"

# Configure CORS with appropriate strictness
if is_production:
    # Production: strict CORS - no regex, explicit origins only
    logger.info("[CORS] Production mode - strict CORS policy")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,  # Explicit whitelist only
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "Accept", "X-Request-ID"],
        expose_headers=["X-Request-ID"],  # Only expose specific headers
        max_age=3600,
    )
else:
    # Development: flexible for local testing on various ports
    logger.info("[CORS] Development mode - flexible CORS for localhost")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        # Allow localhost variations only in development
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):(300[0-9]|8000|8001|5173)$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Request-ID"],
        expose_headers=["X-Request-ID"],  # Limited exposure
        max_age=3600,
    )

logger.info(f"[STARTUP] CORS origins configured: {origins}")
# Request-ID tracing — must be added AFTER CORSMiddleware
app.add_middleware(RequestIdMiddleware)


@app.exception_handler(RequestValidationError)
async def auth_validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Auth endpoints return one generic message for any invalid input, so a
    caller can't tell which field failed (email format, password strength,
    role value, etc). The raw invalid values are never logged - only where
    and from whom the bad request came from.
    """
    if request.url.path.startswith("/auth"):
        client_host = request.client.host if request.client else "unknown"
        logger.warning(f"[VALIDATION] Rejected input on {request.url.path} from {client_host}")
        return JSONResponse(status_code=422, content={"detail": GENERIC_INPUT_ERROR})
    return await request_validation_exception_handler(request, exc)


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


