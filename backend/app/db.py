"""PostgreSQL and Redis lifecycle resources.

The database URL is expected to be Neon's pooled connection string for the
request-driven API. ``statement_cache_size=0`` keeps asyncpg compatible with
Neon's transaction pooler. The direct/unpooled URL is reserved for migrations.
"""

from contextlib import asynccontextmanager
import logging
from typing import Any

from fastapi import FastAPI

from app.core.config import Settings

logger = logging.getLogger(__name__)


async def _close_resource(resource: Any) -> None:
    close = getattr(resource, "close", None)
    if close is not None:
        result = close()
        if hasattr(result, "__await__"):
            await result


async def database_ping(pool: Any) -> bool:
    """Verify the pool reaches PostgreSQL without exposing database details."""

    if pool is None:
        return False
    try:
        async with pool.acquire() as connection:
            return await connection.fetchval("select 1") == 1
    except Exception:
        logger.warning("PostgreSQL readiness probe failed", exc_info=True)
        return False


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
            try:
                import asyncpg

                postgres_pool = await asyncpg.create_pool(
                    dsn=settings.database_url,
                    min_size=settings.database_pool_min_size,
                    max_size=settings.database_pool_max_size,
                    command_timeout=10,
                    timeout=5,
                    statement_cache_size=settings.database_statement_cache_size,
                )
            except Exception:
                # Keep /health available so the deployment reports degraded
                # instead of failing during a cold start with no diagnostics.
                logger.exception("PostgreSQL pool initialization failed")
        if settings.redis_url:
            try:
                from redis.asyncio import Redis

                redis_client = Redis.from_url(
                    settings.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=3,
                    socket_timeout=3,
                )
                await redis_client.ping()
            except Exception:
                # Redis is optional for the HTTP MVP. Keep the API callable so
                # /ready can report the dependency as unavailable.
                logger.exception("Redis initialization failed")
                redis_client = None
        app.state.postgres_pool = postgres_pool
        app.state.redis = redis_client
        yield
    finally:
        if postgres_pool is not None:
            await postgres_pool.close()
        if redis_client is not None:
            await _close_resource(redis_client)

