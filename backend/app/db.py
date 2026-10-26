"""Optional PostgreSQL and Redis lifecycle resources."""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from app.core.config import Settings


async def _close_resource(resource: Any) -> None:
    close = getattr(resource, "close", None)
    if close is not None:
        result = close()
        if hasattr(result, "__await__"):
            await result


@asynccontextmanager
async def lifespan_resources(app: FastAPI, settings: Settings):
    """Create configured pools and close them deterministically on shutdown.

    Local development is intentionally allowed to run without external services;
    production deployments should provide both URLs and can enforce them in the
    deployment environment.
    """

    postgres_pool: Any = None
    redis_client: Any = None
    try:
        if settings.database_url:
            import asyncpg

            postgres_pool = await asyncpg.create_pool(
                dsn=settings.database_url,
                min_size=settings.database_pool_min_size,
                max_size=settings.database_pool_max_size,
                command_timeout=10,
            )
        if settings.redis_url:
            from redis.asyncio import Redis

            redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
            await redis_client.ping()
        app.state.postgres_pool = postgres_pool
        app.state.redis = redis_client
        yield
    finally:
        if postgres_pool is not None:
            await postgres_pool.close()
        if redis_client is not None:
            await _close_resource(redis_client)

