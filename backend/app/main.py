"""FastAPI application entrypoint for OptiLink.ai."""

from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.scraper import router as scraper_router
from app.api.v1.optimization import router as optimization_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.security import SecurityHeadersMiddleware
from app.db import database_ping, lifespan_resources
from app.schemas import HealthResponse, ReadinessResponse, RootResponse

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with lifespan_resources(app, settings):
        yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Production API for LinkedIn profile optimization and growth workflows.",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    docs_url=f"{settings.api_prefix}/docs" if settings.environment != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
app.add_middleware(SecurityHeadersMiddleware)
register_exception_handlers(app)
app.include_router(scraper_router, prefix=settings.api_prefix)
app.include_router(optimization_router, prefix=settings.api_prefix)


@app.get(f"{settings.api_prefix}/health", response_model=HealthResponse, tags=["system"])
async def health(request: Request) -> HealthResponse:
    """Return process health without making an external dependency mandatory."""

    del request
    database_configured = settings.database_url is not None
    redis_configured = settings.redis_url is not None
    return HealthResponse(
        status="ok" if database_configured and redis_configured else "degraded",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        database="configured" if database_configured else "not_configured",
        redis="configured" if redis_configured else "not_configured",
        checked_at=datetime.now(UTC),
    )


@app.get(f"{settings.api_prefix}/ready", response_model=ReadinessResponse, tags=["system"])
async def readiness(request: Request) -> ReadinessResponse:
    """Report whether configured dependencies are reachable for traffic."""

    database_status = "not_configured"
    if settings.database_url:
        database_status = "ok" if await database_ping(getattr(request.app.state, "postgres_pool", None)) else "unavailable"
    redis_status = "not_configured"
    if settings.redis_url:
        redis_status = "ok" if getattr(request.app.state, "redis", None) else "unavailable"
    checks = {"database": database_status, "redis": redis_status}
    ready = all(value in {"ok", "not_configured"} for value in checks.values())
    return ReadinessResponse(ready=ready, checks=checks)


@app.get("/", response_model=RootResponse, include_in_schema=False)
async def root() -> RootResponse:
    return RootResponse(service=settings.app_name, health=f"{settings.api_prefix}/health")

