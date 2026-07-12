"""
LLM Configuration — all models served via Fireworks AI (H100 GPU fleet)

get_gemma_llm()   → GLM-5.2 (guardrail / sentinel)
                    Fast, H100-accelerated; small JSON blob only.
get_granite_llm() → GLM-5.1 (all content agents)
                    High-quality, H100-accelerated; structured JSON output.

Key settings for content agents:
  - response_format={"type": "json_object"}: forces raw JSON output,
    suppresses prose preamble.
  - temperature=0.2: reduces verbose "planning" behaviour.
  - max_tokens=3072: sufficient for all structured outputs.
"""
import os
import logging
from crewai import LLM

logger = logging.getLogger(__name__)

_JSON_FORMAT: dict = {"type": "json_object"}


def get_gemma_llm() -> LLM:
    """GLM-5.2 — guardrail / sentinel agent. Small JSON blob only."""
    key = os.environ.get("FIREWORKS_API_KEY", "")
    if not key:
        logger.warning("FIREWORKS_API_KEY is not set — LLM calls will fail")
    return LLM(
        model="fireworks_ai/accounts/fireworks/models/glm-5p2",
        api_key=key,
        temperature=0.1,
        max_tokens=768,   # slightly more room for detailed safety rationale
        timeout=15,       # fail fast — sentinel must not block content agents
        max_retries=2,
    )


def get_granite_llm() -> LLM:
    """
    GLM-5.1 — all content, quiz, study-plan, and explanation agents.
    Runs on H100 GPUs on Fireworks AI.
    response_format forces JSON-only output.
    temperature=0.2 reduces verbose "planning" behaviour.
    max_tokens=3072 — sufficient for all structured JSON outputs (explanation,
      quiz, wonder cards); keeping this low prevents the Fireworks API from
      generating completions long enough to hit the timeout.
    timeout=120 — raised from 90 s to survive occasional API slowdowns while
      still bounding runaway requests.
    max_retries=2 — retry transient timeouts / 5xx errors automatically.
    """
    key = os.environ.get("FIREWORKS_API_KEY", "")
    if not key:
        logger.warning("FIREWORKS_API_KEY is not set — LLM calls will fail")
    return LLM(
        model="fireworks_ai/accounts/fireworks/models/glm-5p1",
        api_key=key,
        temperature=0.2,
        max_tokens=3072,
        timeout=120,
        max_retries=2,
        response_format=_JSON_FORMAT,
    )
