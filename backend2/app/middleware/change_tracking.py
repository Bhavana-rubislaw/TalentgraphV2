"""
Change Tracking Middleware
Automatically logs all API requests and responses for comprehensive auditing
"""

import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message

from ..core.logging_config import get_logger, log_change
from ..models import User

logger = get_logger(__name__)


class ChangeTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track all API changes automatically
    Logs request/response pairs with timing and user context
    """
    
    def __init__(self, app, excluded_paths: Optional[list] = None):
        super().__init__(app)
        self.excluded_paths = excluded_paths or [
            "/health",
            "/",
            "/docs",
            "/openapi.json",
            "/api/logs/frontend",  # Avoid recursive logging
        ]
    
    async def dispatch(self, request: Request, call_next):
        # Skip excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)
        
        # Skip GET requests for most endpoints (unless it's important data)
        if request.method == "GET" and not self._is_important_get_endpoint(request.url.path):
            return await call_next(request)
        
        start_time = time.time()
        request_id = getattr(request.state, 'request_id', None)
        
        # Capture request details
        request_details = await self._capture_request(request)
        
        # Get user context if available
        user_context = await self._get_user_context(request)
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = round((time.time() - start_time) * 1000, 2)
        
        # Capture response details
        response_details = await self._capture_response(response)
        
        # Log the change
        await self._log_api_change(
            request_details,
            response_details,
            user_context,
            request_id,
            duration_ms
        )
        
        return response
    
    def _is_important_get_endpoint(self, path: str) -> bool:
        """Determine if a GET endpoint should be logged"""
        important_gets = [
            "/api/candidates/",
            "/api/job-postings/",
            "/api/applications/",
            "/api/dashboard/",
            "/api/analytics/"
        ]
        return any(path.startswith(endpoint) for endpoint in important_gets)
    
    async def _capture_request(self, request: Request) -> Dict[str, Any]:
        """Capture request details for logging"""
        
        # Get request body if present
        request_body = None
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            try:
                # Read body
                body = await request.body()
                if body:
                    # Try to parse as JSON for logging
                    try:
                        request_body = json.loads(body.decode('utf-8'))
                        # Sanitize sensitive data
                        request_body = self._sanitize_data(request_body)
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        request_body = {"_raw_size": len(body)}
                
                # Reset body stream for the actual handler
                async def receive():
                    return {"type": "http.request", "body": body}
                request._receive = receive
                
            except Exception as e:
                logger.warning(f"Failed to capture request body: {e}")
        
        return {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "body": request_body,
            "client_ip": request.client.host if request.client else None
        }
    
    async def _capture_response(self, response: Response) -> Dict[str, Any]:
        """Capture response details for logging"""
        
        return {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "media_type": response.media_type
        }
    
    async def _get_user_context(self, request: Request) -> Optional[Dict[str, Any]]:
        """Extract user context from request if available"""
        
        try:
            # Check for Authorization header
            auth_header = request.headers.get("authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return None
            
            # Extract token (simplified - in real implementation, decode JWT)
            # For now, just indicate that a user is authenticated
            return {
                "authenticated": True,
                "auth_method": "jwt"
            }
            
        except Exception:
            return None
    
    def _sanitize_data(self, data: Any) -> Any:
        """Remove sensitive information from logged data"""
        
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if any(sensitive in key.lower() for sensitive in 
                      ["password", "token", "secret", "key", "auth"]):
                    sanitized[key] = "[REDACTED]"
                else:
                    sanitized[key] = self._sanitize_data(value)
            return sanitized
        elif isinstance(data, list):
            return [self._sanitize_data(item) for item in data]
        else:
            return data
    
    def _extract_entity_info(self, request_details: Dict[str, Any]) -> Dict[str, Any]:
        """Extract entity type and ID from request path"""
        
        path = request_details["path"]
        method = request_details["method"]
        
        # Parse path to determine entity type
        entity_info = {"entity_type": "unknown", "entity_id": None, "action": method.lower()}
        
        path_parts = [p for p in path.split("/") if p]
        
        if len(path_parts) >= 2 and path_parts[0] == "api":
            entity_type = path_parts[1].replace("-", "_")
            entity_info["entity_type"] = entity_type
            
            # Extract ID if present
            if len(path_parts) >= 3:
                try:
                    entity_id = int(path_parts[2])
                    entity_info["entity_id"] = str(entity_id)
                except ValueError:
                    # Not a numeric ID, might be a sub-resource
                    if len(path_parts) >= 4:
                        try:
                            entity_id = int(path_parts[3])
                            entity_info["entity_id"] = str(entity_id)
                        except ValueError:
                            pass
            
            # Determine action based on method and path
            if method == "POST":
                entity_info["action"] = "create"
            elif method == "PUT" or method == "PATCH":
                entity_info["action"] = "update"
            elif method == "DELETE":
                entity_info["action"] = "delete"
            elif method == "GET":
                if entity_info["entity_id"]:
                    entity_info["action"] = "view"
                else:
                    entity_info["action"] = "list"
        
        return entity_info
    
    async def _log_api_change(
        self,
        request_details: Dict[str, Any],
        response_details: Dict[str, Any],
        user_context: Optional[Dict[str, Any]],
        request_id: Optional[str],
        duration_ms: float
    ):
        """Log the API change with structured information"""
        
        entity_info = self._extract_entity_info(request_details)
        
        # Determine log level based on response status
        status_code = response_details["status_code"]
        if status_code >= 500:
            level = "ERROR"
        elif status_code >= 400:
            level = "WARNING"
        else:
            level = "INFO"
        
        # Create message
        method = request_details["method"]
        path = request_details["path"]
        message = f"{method} {path} - {status_code} ({duration_ms}ms)"
        
        # Log the change
        logger_method = getattr(logger, level.lower())
        logger_method(
            message,
            extra={
                "action": entity_info["action"],
                "entity_type": entity_info["entity_type"],
                "entity_id": entity_info["entity_id"],
                "request_id": request_id,
                "metadata": {
                    "request": {
                        "method": method,
                        "path": path,
                        "query_params": request_details["query_params"],
                        "client_ip": request_details["client_ip"]
                    },
                    "response": {
                        "status_code": status_code,
                        "duration_ms": duration_ms
                    },
                    "user_context": user_context
                }
            }
        )