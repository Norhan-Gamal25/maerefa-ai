"""
Pydantic models for MaerefaFlow state and API schemas.
"""
from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


# ── Flow State ────────────────────────────────────────────────────────────
class SentinelOutput(BaseModel):
    mode: str = Field(description="One of: kids, college, researcher")
    domain: str = Field(description="Detected STEM domain")
    safe_prompt: str = Field(description="Sanitised, aniconic-safe version of the prompt")
    visual_prompt: str = Field(description="Aniconic SDXL image generation prompt")
    blocked: bool = Field(default=False, description="True if the request must be rejected")
    block_reason: str = Field(default="", description="Human-readable reason for blocking")


class MaerefaState(BaseModel):
    raw_prompt: str = ""
    mode: str = ""
    domain: str = ""
    safe_prompt: str = ""
    visual_prompt: str = ""
    language_hint: str = ""  # original raw_prompt language for crew tasks
    explanation: dict[str, Any] = Field(default_factory=dict)
    wonder_cards: list[dict[str, str]] = Field(default_factory=list)
    quiz: dict[str, Any] = Field(default_factory=dict)
    image_url: str | None = None
    agent_trace: list[str] = Field(default_factory=list)


# ── API Request / Response ────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=500)
    mode: str | None = Field(None, description="Optional mode override: kids|college|researcher")


class GenerateResponse(BaseModel):
    task_id: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str = Field(description="pending | running | done | error")
    progress: int = Field(default=0, ge=0, le=100)
    current_agent: str = ""
    result: dict[str, Any] | None = None
    error: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str


class WonderCard(BaseModel):
    emoji: str
    fact: str


class QuizQuestion(BaseModel):
    question: str
    type: str
    options: list[str]
    correct: str
    explanation: str


