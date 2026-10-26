"""Structured API error types and exception handlers."""

from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiError(Exception):
    """An expected application error that can be safely returned to a client."""

    def __init__(self, code: str, message: str, http_status: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status


def error_body(code: str, message: str, request: Request, details: Any = None) -> dict[str, Any]:
    """Build the stable error envelope consumed by the frontend."""

    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "request_id": getattr(request.state, "request_id", "unknown"),
        }
    }
    if details is not None:
        body["error"]["details"] = details
    return body


async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.http_status,
        content=error_body(exc.code, exc.message, request),
    )


async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_body("VALIDATION_ERROR", "Request validation failed", request, exc.errors()),
    )


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """Keep internal exception details out of production responses."""

    del exc
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_body("INTERNAL_SERVER_ERROR", "An unexpected server error occurred", request),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Install the application-wide error handlers."""

    app.add_exception_handler(ApiError, handle_api_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(Exception, handle_unexpected_error)

