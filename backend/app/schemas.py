"""Pydantic response contracts shared by the API."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ErrorDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    request_id: str
    details: list[dict[str, object]] | None = None


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ErrorDetail


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok", "degraded"]
    service: str
    version: str
    environment: str
    database: Literal["configured", "not_configured"]
    redis: Literal["configured", "not_configured"]
    checked_at: datetime


class RootResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    service: str
    health: str


class ReadinessResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ready: bool
    checks: dict[str, Literal["ok", "not_configured", "unavailable"]]


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: str = Field(min_length=3, max_length=255)
    display_name: str = Field(min_length=1, max_length=120)


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    email: str
    display_name: str
    created_at: datetime

