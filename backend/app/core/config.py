"""Typed runtime configuration for the OptiLink API."""

import json
import os
from functools import lru_cache
from typing import Any, Literal

from pydantic import BaseModel, Field, SecretStr, field_validator


class Settings(BaseModel):
    """Environment-backed settings with safe local defaults."""

    model_config = {"extra": "ignore"}

    app_name: str = "OptiLink.ai API"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"

    database_url: str | None = Field(default=None, repr=False)
    database_pool_min_size: int = Field(default=1, ge=1, le=20)
    database_pool_max_size: int = Field(default=10, ge=1, le=50)
    redis_url: str | None = Field(default=None, repr=False)

    groq_api_key: SecretStr | None = Field(default=None, repr=False)
    groq_model: str = "llama-3.3-70b-versatile"

    frontend_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    trusted_hosts: list[str] = Field(
        default_factory=lambda: ["localhost", "127.0.0.1", "testserver"]
    )
    max_scrape_payload_bytes: int = Field(default=1_000_000, ge=1_024, le=10_000_000)
    scrape_session_ttl_seconds: int = Field(default=900, ge=60, le=86_400)

    @field_validator("database_pool_max_size")
    @classmethod
    def max_pool_must_cover_min_pool(cls, value: int, info: object) -> int:
        """Keep the pool bounds internally consistent."""

        min_size = getattr(info, "data", {}).get("database_pool_min_size", 1)
        if value < min_size:
            raise ValueError("database_pool_max_size must be >= database_pool_min_size")
        return value

    @classmethod
    def from_environment(cls) -> "Settings":
        """Load supported environment variables without a settings plugin."""

        def value(name: str, default: Any) -> Any:
            return os.environ.get(name, default)

        def list_value(name: str, default: list[str]) -> list[str]:
            raw = os.environ.get(name)
            if raw is None:
                return default
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = [item.strip() for item in raw.split(",") if item.strip()]
            if not isinstance(parsed, list) or not all(isinstance(item, str) for item in parsed):
                raise ValueError(f"{name} must be a JSON array or comma-separated string")
            return parsed

        groq_key = os.environ.get("GROQ_API_KEY")
        return cls(
            app_name=value("APP_NAME", "OptiLink.ai API"),
            app_version=value("APP_VERSION", "0.1.0"),
            environment=value("ENVIRONMENT", "development"),
            log_level=value("LOG_LEVEL", "INFO"),
            api_prefix=value("API_PREFIX", "/api/v1"),
            database_url=os.environ.get("DATABASE_URL"),
            database_pool_min_size=int(value("DATABASE_POOL_MIN_SIZE", 1)),
            database_pool_max_size=int(value("DATABASE_POOL_MAX_SIZE", 10)),
            redis_url=os.environ.get("REDIS_URL"),
            groq_api_key=SecretStr(groq_key) if groq_key else None,
            groq_model=value("GROQ_MODEL", "llama-3.3-70b-versatile"),
            frontend_origins=list_value(
                "FRONTEND_ORIGINS", ["http://localhost:3000", "http://127.0.0.1:3000"]
            ),
            trusted_hosts=list_value("TRUSTED_HOSTS", ["localhost", "127.0.0.1", "testserver"]),
            max_scrape_payload_bytes=int(value("MAX_SCRAPE_PAYLOAD_BYTES", 1_000_000)),
            scrape_session_ttl_seconds=int(value("SCRAPE_SESSION_TTL_SECONDS", 900)),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide immutable configuration snapshot."""

    return Settings.from_environment()

