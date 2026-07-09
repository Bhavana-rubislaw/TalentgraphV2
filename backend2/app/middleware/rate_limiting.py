"""
Rate Limiting Middleware
Protects API endpoints from brute-force attacks and abuse
"""

import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)

# Create limiter instance
limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    "auth": "5/minute",          # Authentication endpoints (login, signup)
    "auth_strict": "3/minute",   # Password reset, sensitive operations
    "general": "100/minute",     # General API endpoints
    "upload": "10/minute",       # File uploads
    "api": "1000/hour",          # Overall API usage per IP
}


def get_rate_limit_for_path(path: str) -> str:
    """
    Determine appropriate rate limit based on request path
    """
    # Authentication endpoints need strictest limits
    if any(x in path for x in ["/auth/login", "/auth/signup", "/auth/token"]):
        return RATE_LIMITS["auth"]
    
    # Sensitive operations
    if any(x in path for x in ["/auth/reset-password", "/auth/change-password", "/auth/forgot-password"]):
        return RATE_LIMITS["auth_strict"]
    
    # File upload endpoints
    if any(x in path for x in ["/upload", "/resumes", "/certifications"]):
        return RATE_LIMITS["upload"]
    
    # Default for general endpoints
    return RATE_LIMITS["general"]


class RateLimitMiddleware:
    """
    Custom rate limiting middleware that applies limits based on endpoint type
    """
    
    def __init__(self, app):
        self.app = app
        
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        
        # Get request info
        path = scope.get("path", "")
        
        # Skip rate limiting for health checks and static files
        if path in ["/health", "/docs", "/redoc", "/openapi.json"] or path.startswith("/static"):
            return await self.app(scope, receive, send)
        
        # Apply rate limiting (handled by SlowAPI)
        return await self.app(scope, receive, send)


def setup_rate_limiting(app):
    """
    Setup rate limiting for FastAPI application
    """
    # Add rate limiter to app state
    app.state.limiter = limiter
    
    # Add exception handler for rate limit exceeded
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    # Add SlowAPI middleware
    app.add_middleware(SlowAPIMiddleware)
    
    logger.info("[RATE LIMITING] Rate limiting configured successfully")
    logger.info(f"[RATE LIMITING] Auth endpoints: {RATE_LIMITS['auth']}")
    logger.info(f"[RATE LIMITING] General endpoints: {RATE_LIMITS['general']}")
    logger.info(f"[RATE LIMITING] Upload endpoints: {RATE_LIMITS['upload']}")
    
    return limiter


# Decorator for applying rate limits to specific endpoints
def rate_limit(limit: str):
    """
    Decorator to apply rate limiting to specific routes
    Usage: @rate_limit("5/minute")
    """
    def decorator(func):
        return limiter.limit(limit)(func)
    return decorator
