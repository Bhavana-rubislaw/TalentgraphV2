"""
Request ID middleware — pure ASGI implementation.

Generates (or passes through) a UUID4 request_id per request, attaches
it to scope["state"]["request_id"] and echoes it back in the X-Request-Id
response header.  Routers pick it up via request.state.request_id.

NOTE: Intentionally NOT using BaseHTTPMiddleware.  BaseHTTPMiddleware
buffers the full response body before passing it along, which causes it
to swallow CORS headers that CORSMiddleware already attached when an
exception escapes the route handler.  The pure ASGI approach intercepts
only the `http.response.start` message (where headers live) and leaves
the body streaming unchanged — so CORS headers are always intact.
"""

import uuid
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # Resolve request_id from incoming header or mint a new one
        headers_raw: list = scope.get("headers", [])
        request_id = ""
        for name, value in headers_raw:
            if name.lower() == b"x-request-id":
                request_id = value.decode("latin-1")
                break
        if not request_id:
            request_id = str(uuid.uuid4())

        # Expose on scope state so routers can read it
        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["request_id"] = request_id

        async def send_with_id(message: dict) -> None:
            if message["type"] == "http.response.start":
                # Append header without disturbing any CORS headers already set
                headers = MutableHeaders(scope=message)
                headers.append("X-Request-Id", request_id)
            await send(message)

        await self.app(scope, receive, send_with_id)
