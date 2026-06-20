"""
FastAPI middleware: rate limiting, request logging, Prometheus metrics,
CORS setup, and correlation-ID injection.
"""

import time
import uuid
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)


# ---------------------------------------------------------------------------
# Correlation-ID middleware
# ---------------------------------------------------------------------------
class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Injects a unique correlation/request ID into every request."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request.state.correlation_id = correlation_id

        # Bind to structlog contextvars so all log lines include it
        import structlog
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(correlation_id=correlation_id)

        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        return response


# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs method, path, status code, and duration for every request."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "request_completed",
            method=request.method,
            path=str(request.url.path),
            status=response.status_code,
            duration_ms=duration_ms,
            correlation_id=getattr(request.state, "correlation_id", "N/A"),
        )
        return response


# ---------------------------------------------------------------------------
# Prometheus metrics middleware
# ---------------------------------------------------------------------------
class PrometheusMiddleware(BaseHTTPMiddleware):
    """Records request count and latency histogram to Prometheus."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        method = request.method
        path = request.url.path

        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        REQUEST_COUNT.labels(method=method, path=path, status=response.status_code).inc()
        REQUEST_LATENCY.labels(method=method, path=path).observe(duration)

        return response


# ---------------------------------------------------------------------------
# Rate limiting middleware (token-bucket via Redis)
# ---------------------------------------------------------------------------
class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP token-bucket rate limiter backed by Redis.

    Falls through silently if Redis is unavailable so the application
    remains usable during development without a Redis instance.
    """

    def __init__(self, app: ASGIApp, max_requests: int = settings.RATE_LIMIT_PER_MINUTE) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = 60

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        cache_key = f"rate_limit:{client_ip}"

        try:
            from app.core.redis import redis_client

            current = await redis_client.get(cache_key)
            if current is None:
                await redis_client.set(cache_key, "1", ttl=self.window_seconds)
            else:
                count = int(current)
                if count >= self.max_requests:
                    return Response(
                        content='{"error":{"code":"RATE_LIMITED","message":"Rate limit exceeded"}}',
                        status_code=429,
                        media_type="application/json",
                        headers={"Retry-After": str(self.window_seconds)},
                    )
                await redis_client.incr(cache_key)
        except Exception:
            # Redis unavailable — allow the request
            pass

        return await call_next(request)


# ---------------------------------------------------------------------------
# CORS setup
# ---------------------------------------------------------------------------
def setup_cors(app: FastAPI) -> None:
    """Add CORS middleware with the configured allowed origins."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-ID"],
    )


# ---------------------------------------------------------------------------
# Middleware registration helper
# ---------------------------------------------------------------------------
def register_middleware(app: FastAPI) -> None:
    """Register all custom middleware on the FastAPI application.

    Order matters — outermost middleware is added last.
    """
    # CORS (outermost — added via add_middleware, not BaseHTTPMiddleware)
    setup_cors(app)

    # Inner → outer execution order when using add_middleware:
    # The last one added wraps the outermost, so add in reverse order.
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(PrometheusMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
