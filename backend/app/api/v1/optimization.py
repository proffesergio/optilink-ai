"""Human-reviewed profile gap analysis powered by Groq."""

import asyncio
import json
import logging
import time
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import get_settings
from app.core.errors import ApiError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/optimization", tags=["optimization"])


class ProfileSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    headline: str = Field(default="", max_length=300)
    about: str = Field(default="", max_length=5_000)
    skills: list[str] = Field(default_factory=list, max_length=100)
    target_role: str = Field(default="", max_length=160)

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, values: list[str]) -> list[str]:
        cleaned = [value for value in values if value]
        if any(len(value) > 100 for value in cleaned):
            raise ValueError("Each skill must be at most 100 characters")
        return cleaned


class CompetitorSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    label: str = Field(min_length=1, max_length=120)
    headline: str = Field(default="", max_length=300)
    about: str = Field(default="", max_length=5_000)
    skills: list[str] = Field(default_factory=list, max_length=100)
    engagement_score: float | None = Field(default=None, ge=0, le=100)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile: ProfileSnapshot
    competitors: list[CompetitorSnapshot] = Field(min_length=1, max_length=20)
    target_keywords: list[str] = Field(min_length=1, max_length=100)

    @field_validator("target_keywords")
    @classmethod
    def normalize_keywords(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for value in values:
            keyword = " ".join(value.split()).lower()
            if not keyword or len(keyword) > 100:
                raise ValueError("Keywords must be between 1 and 100 characters")
            if keyword not in seen:
                normalized.append(keyword)
                seen.add(keyword)
        if not normalized:
            raise ValueError("At least one non-empty keyword is required")
        return normalized


class KeywordGap(BaseModel):
    model_config = ConfigDict(extra="forbid")

    keyword: str = Field(min_length=1, max_length=100)
    user_evidence: str = Field(max_length=500)
    competitor_frequency: int = Field(ge=0, le=20)
    gap_score: float = Field(ge=0, le=100)
    recommendation: str = Field(min_length=1, max_length=1_000)


class OptimizationAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=2_000)
    profile_score: float = Field(ge=0, le=100)
    keyword_gaps: list[KeywordGap] = Field(max_length=100)
    headline_suggestions: list[str] = Field(min_length=1, max_length=5)
    about_recommendations: list[str] = Field(min_length=1, max_length=10)
    human_review_actions: list[str] = Field(min_length=1, max_length=10)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    model: str = ""


def _keyword_context(request: AnalyzeRequest) -> dict[str, object]:
    """Compute deterministic keyword counts before asking the model to interpret them."""

    profile_text = " ".join(
        [request.profile.headline, request.profile.about, *request.profile.skills]
    ).lower()
    competitor_texts = [
        " ".join([competitor.headline, competitor.about, *competitor.skills]).lower()
        for competitor in request.competitors
    ]
    return {
        "profile_keyword_presence": {
            keyword: profile_text.count(keyword) for keyword in request.target_keywords
        },
        "competitor_keyword_frequency": {
            keyword: sum(keyword in text for text in competitor_texts)
            for keyword in request.target_keywords
        },
    }


def _system_prompt() -> str:
    return """You are OptiLink.ai's profile optimization analyst.

Return only valid JSON matching the supplied response schema. Analyze the supplied
profile against the competitor snapshots and target keywords. Separate observed
evidence from recommendations. Never invent credentials, employment, metrics,
clients, or achievements. A recommendation must be phrased as a human-reviewable
edit, not an instruction to misrepresent experience. Keep headline suggestions
under 220 characters. Rank keyword gaps by evidence-based opportunity and include
only keywords present in the target list. The user makes the final edits and
publishes nothing automatically.
"""


async def _request_analysis(request: AnalyzeRequest) -> OptimizationAnalysis:
    settings = get_settings()
    if settings.groq_api_key is None:
        raise ApiError(
            "AI_NOT_CONFIGURED",
            "Groq analysis is not configured on this deployment",
            http_status=503,
        )

    try:
        from groq import AsyncGroq
    except ImportError as exc:
        logger.exception("Groq dependency is unavailable")
        raise ApiError("AI_DEPENDENCY_UNAVAILABLE", "AI analysis dependency is unavailable", 503) from exc

    client = AsyncGroq(api_key=settings.groq_api_key.get_secret_value())
    payload = {
        "profile": request.profile.model_dump(mode="json"),
        "competitors": [competitor.model_dump(mode="json") for competitor in request.competitors],
        "target_keywords": request.target_keywords,
        "deterministic_keyword_context": _keyword_context(request),
    }
    last_error: Exception | None = None
    started = time.perf_counter()
    try:
        for attempt in range(3):
            try:
                completion = await client.chat.completions.create(
                    model=settings.groq_model,
                    temperature=0.2,
                    max_tokens=3_000,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": _system_prompt()},
                        {
                            "role": "user",
                            "content": json.dumps(payload, ensure_ascii=False),
                        },
                    ],
                )
                content = completion.choices[0].message.content if completion.choices else None
                if not content:
                    raise ValueError("Groq returned an empty response")
                parsed: Any = json.loads(content)
                result = OptimizationAnalysis.model_validate(parsed)
                result.generated_at = datetime.now(UTC)
                result.model = settings.groq_model
                return result
            except (json.JSONDecodeError, ValueError) as exc:
                last_error = exc
                break
            except Exception as exc:  # SDK exceptions vary by installed Groq version.
                last_error = exc
                if attempt < 2:
                    await asyncio.sleep(0.25 * (2**attempt))
    finally:
        close = getattr(client, "close", None)
        if close is not None:
            await close()

    logger.warning("Groq analysis failed after retries: %s", type(last_error).__name__)
    logger.info("Groq analysis duration_ms=%.2f", (time.perf_counter() - started) * 1000)
    raise ApiError("AI_ANALYSIS_FAILED", "The optimization analysis could not be completed", 502)


@router.post("/analyze", response_model=OptimizationAnalysis)
async def analyze_profile(request: AnalyzeRequest) -> OptimizationAnalysis:
    """Generate a structured, human-reviewed profile gap analysis."""

    return await _request_analysis(request)

