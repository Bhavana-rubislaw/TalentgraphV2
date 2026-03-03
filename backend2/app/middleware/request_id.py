"""
Request ID middleware.

Generates (or passes through) a UUID4 request_id per request, attaches
it to request.state.request_id and echoes it back in the X-Request-Id
response header. Routers pick it up from request.state.
"""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response
