"""Security and request correlation middleware."""

from time import perf_counter
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add conservative browser security headers to every HTTP response."""

    async def dispatch(self, request: Request, call_next: object) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid4())
        request.state.request_id = request_id
        started = perf_counter()
        response = await call_next(request)  # type: ignore[operator]
        response.headers["x-request-id"] = request_id
        response.headers["x-content-type-options"] = "nosniff"
        response.headers["x-frame-options"] = "DENY"
        response.headers["referrer-policy"] = "strict-origin-when-cross-origin"
        response.headers["permissions-policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["cache-control"] = "no-store"
        response.headers["server-timing"] = f"app;dur={(perf_counter() - started) * 1000:.2f}"
        return response

