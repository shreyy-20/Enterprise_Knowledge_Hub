"""
Custom exception hierarchy and FastAPI exception handlers.
"""

from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        status_code: int = 500,
        detail: str = "An unexpected error occurred",
        error_code: str = "INTERNAL_ERROR",
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        self.headers = headers
        super().__init__(self.detail)


class NotFoundError(AppException):
    """Resource not found (404)."""

    def __init__(
        self,
        detail: str = "Resource not found",
        error_code: str = "NOT_FOUND",
    ) -> None:
        super().__init__(status_code=404, detail=detail, error_code=error_code)


class UnauthorizedError(AppException):
    """Authentication required (401)."""

    def __init__(
        self,
        detail: str = "Not authenticated",
        error_code: str = "UNAUTHORIZED",
    ) -> None:
        super().__init__(
            status_code=401,
            detail=detail,
            error_code=error_code,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenError(AppException):
    """Insufficient permissions (403)."""

    def __init__(
        self,
        detail: str = "Not enough permissions",
        error_code: str = "FORBIDDEN",
    ) -> None:
        super().__init__(status_code=403, detail=detail, error_code=error_code)


class ValidationError(AppException):
    """Request validation error (422)."""

    def __init__(
        self,
        detail: str = "Validation error",
        error_code: str = "VALIDATION_ERROR",
    ) -> None:
        super().__init__(status_code=422, detail=detail, error_code=error_code)


class ConflictError(AppException):
    """Resource conflict (409)."""

    def __init__(
        self,
        detail: str = "Resource conflict",
        error_code: str = "CONFLICT",
    ) -> None:
        super().__init__(status_code=409, detail=detail, error_code=error_code)


class RateLimitError(AppException):
    """Rate limit exceeded (429)."""

    def __init__(
        self,
        detail: str = "Rate limit exceeded. Please try again later.",
        error_code: str = "RATE_LIMITED",
    ) -> None:
        super().__init__(
            status_code=429,
            detail=detail,
            error_code=error_code,
            headers={"Retry-After": "60"},
        )


class InternalError(AppException):
    """Internal server error (500)."""

    def __init__(
        self,
        detail: str = "Internal server error",
        error_code: str = "INTERNAL_ERROR",
    ) -> None:
        super().__init__(status_code=500, detail=detail, error_code=error_code)


# ---------------------------------------------------------------------------
# FastAPI exception handlers
# ---------------------------------------------------------------------------

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle all AppException subclasses uniformly."""
    body: Dict[str, Any] = {
        "error": {
            "code": exc.error_code,
            "message": exc.detail,
        },
        "path": str(request.url),
        "method": request.method,
    }
    return JSONResponse(
        status_code=exc.status_code,
        content=body,
        headers=exc.headers,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    body: Dict[str, Any] = {
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
        },
        "path": str(request.url),
        "method": request.method,
    }
    return JSONResponse(status_code=500, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI application."""
    app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, generic_exception_handler)
