"""Isolated browser-extension WebSocket bridge.

The extension sends short-lived DOM snapshots to this endpoint. Snapshots stay
in process memory until the matching ``complete`` message and are then discarded
after the response is produced. No cookies, authorization headers, or extension
credentials are accepted by the payload contract.
"""

import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.core.config import get_settings

router = APIRouter(prefix="/scraper", tags=["scraper"])
settings = get_settings()

_SENSITIVE_PATTERNS = (
    re.compile(r"(?i)(cookie|set-cookie|authorization|bearer|csrf|xsrf|password|passwd|token)\s*[:=]\s*(?:bearer\s+)?[^\s;]+"),
    re.compile(r"(?i)(session|li_at|jsessionid)\s*[:=]\s*[^\s;]+"),
)


class ScrapeMessage(BaseModel):
    """Strict extension-to-API message contract."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    session_id: UUID
    sequence: int = Field(ge=0, le=100_000)
    kind: Literal["profile_snapshot", "heartbeat", "complete", "error"]
    source_url: AnyHttpUrl | None = None
    dom_text: str = Field(default="", max_length=200_000)

    @field_validator("source_url")
    @classmethod
    def linkedin_source_only(cls, value: AnyHttpUrl | None) -> AnyHttpUrl | None:
        if value is not None and value.host not in {"linkedin.com", "www.linkedin.com"}:
            raise ValueError("source_url must be a LinkedIn URL")
        return value


class ScrapeAck(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["ack"]
    session_id: UUID
    sequence: int
    status: Literal["accepted", "completed"]
    cleaned_text_length: int = Field(ge=0)


class ScrapeError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["error"]
    code: str
    message: str


@dataclass
class SessionBuffer:
    """Short-lived in-memory data for one extension connection."""

    chunks: list[str] = field(default_factory=list)
    last_sequence: int = -1
    expires_at: datetime = field(default_factory=lambda: datetime.now(UTC))


_sessions: dict[UUID, SessionBuffer] = defaultdict(SessionBuffer)


def _clean_dom_text(value: str) -> str:
    """Remove credential-shaped fragments and normalize untrusted DOM text."""

    cleaned = value.replace("\x00", " ")
    for pattern in _SENSITIVE_PATTERNS:
        cleaned = pattern.sub("[redacted]", cleaned)
    return "\n".join(line.strip() for line in cleaned.splitlines() if line.strip())


def _purge_expired_sessions() -> None:
    now = datetime.now(UTC)
    expired = [session_id for session_id, session in _sessions.items() if session.expires_at <= now]
    for session_id in expired:
        _sessions.pop(session_id, None)


async def _send_error(websocket: WebSocket, code: str, message: str) -> None:
    await websocket.send_json(ScrapeError(type="error", code=code, message=message).model_dump(mode="json"))


@router.websocket("/ws")
async def scraper_websocket(websocket: WebSocket) -> None:
    """Accept sanitized DOM text from the isolated extension runtime."""

    origin = websocket.headers.get("origin")
    allowed_origins = set(settings.frontend_origins)
    if origin and origin not in allowed_origins:
        await websocket.close(code=1008, reason="Origin is not allowed")
        return

    await websocket.accept()
    connection_id = uuid4()
    try:
        while True:
            _purge_expired_sessions()
            try:
                raw_message = await websocket.receive_text()
                if len(raw_message.encode("utf-8")) > settings.max_scrape_payload_bytes:
                    await _send_error(websocket, "PAYLOAD_TOO_LARGE", "Scrape payload exceeds the configured limit")
                    await websocket.close(code=1009, reason="Payload too large")
                    return
                message = ScrapeMessage.model_validate_json(raw_message)
            except (json.JSONDecodeError, ValidationError) as exc:
                del exc
                await _send_error(websocket, "INVALID_PAYLOAD", "Scrape payload does not match the API contract")
                continue

            session = _sessions[message.session_id]
            if session.last_sequence >= message.sequence:
                await _send_error(websocket, "SEQUENCE_REPLAY", "Message sequence must increase monotonically")
                continue
            session.last_sequence = message.sequence
            session.expires_at = datetime.now(UTC) + timedelta(seconds=settings.scrape_session_ttl_seconds)

            cleaned_text = _clean_dom_text(message.dom_text)
            if message.kind == "profile_snapshot" and cleaned_text:
                session.chunks.append(cleaned_text)
            if message.kind == "error":
                _sessions.pop(message.session_id, None)
                await _send_error(websocket, "EXTENSION_ERROR", "The extension reported a scrape failure")
                continue
            if message.kind == "complete":
                joined_length = sum(len(chunk) for chunk in session.chunks)
                _sessions.pop(message.session_id, None)
                acknowledgement = ScrapeAck(
                    type="ack",
                    session_id=message.session_id,
                    sequence=message.sequence,
                    status="completed",
                    cleaned_text_length=joined_length,
                )
            else:
                acknowledgement = ScrapeAck(
                    type="ack",
                    session_id=message.session_id,
                    sequence=message.sequence,
                    status="accepted",
                    cleaned_text_length=len(cleaned_text),
                )
            await websocket.send_json(acknowledgement.model_dump(mode="json"))
    except WebSocketDisconnect:
        # TTL cleanup handles abandoned sessions without retaining browser data.
        return
    finally:
        del connection_id

