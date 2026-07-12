"""
/api/problems — AI-generated problem endpoint.

Accepts { topic, mode } and returns { problems: [Problem, Problem, Problem] }
where each problem has the full ProblemSolver schema.

/api/top-problems — returns the top 5 canonical, well-known problems for a
given domain + mode.  Results are in-process cached per (domain, mode) pair so
the first call pays the LLM round-trip cost; subsequent calls are instant.

Design goals:
  • Fast: single LLM call, one JSON object, no polling needed.
  • Structured: strict JSON schema enforced via system prompt.
  • Mode-aware: kids / college / researcher adjusts difficulty language.
  • Robust: malformed LLM output triggers graceful fallback problems.
"""
from __future__ import annotations

import json
import logging
import os
import re
import uuid
from typing import Any

import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Request / Response schemas ────────────────────────────────────────────────

class ProblemsRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=200)
    mode: str = Field(default="college")


class TopProblemsRequest(BaseModel):
    domain: str = Field(default="cs")   # cs | math | physics | chemistry | biology | economics | general
    mode: str = Field(default="college")


# ── LLM call (direct Fireworks AI, no CrewAI overhead) ───────────────────────

_FIREWORKS_CHAT_URL = (
    "https://api.fireworks.ai/inference/v1/chat/completions"
)
_MODEL = "accounts/fireworks/models/llama4-maverick-instruct-basic"

_SYSTEM_PROMPT = """\
You are an expert STEM educator and problem designer. Your goal is to create genuinely challenging,
real-world problems that build deep understanding — not toy exercises.
Return ONLY a valid JSON object — no prose, no markdown fences, no commentary.

JSON schema:
{
  "problems": [
    {
      "id": "<unique string>",
      "domain": "<cs|math|physics|chemistry|biology|economics|general>",
      "title": "<concise problem title>",
      "difficulty": "<Easy|Medium|Hard>",
      "tag": "<sub-topic tag, e.g. Recursion, Kinematics, Algebra>",
      "problem": "<full problem statement — 3–5 sentences with precise numerical data, context, and a clear question. Use ** for bold, unicode math symbols (∫ ∑ √ ∞ ∂ etc.)>",
      "hints": [
        "<hint 1: conceptual direction>",
        "<hint 2: intermediate step or key formula>",
        "<hint 3: near-final nudge toward the answer>"
      ],
      "steps": [
        {"label": "<Step N: short label>", "content": "<2–4 sentences of full derivation/reasoning including formulas and intermediate values>", "isKey": <true|false>}
      ],
      "answer": "<exact numerical or symbolic final answer with units/justification>",
      "insight": "<2–3 sentence takeaway connecting this result to a broader principle or real-world application>"
    }
  ]
}

Rules:
- Generate EXACTLY 3 problems: Easy, Medium, Hard (in that order).
- Each problem MUST have 4–6 well-developed steps with detailed mathematical or logical content.
- Each problem has EXACTLY 3 hints that progressively guide without giving away the answer.
- Use REAL numbers: specific masses, velocities, frequencies, data structures, economic values — not vague placeholders.
- For CS problems: specify the exact algorithm, data structure, input size, and expected complexity.
- For math/physics/chemistry: carry units through every step, verify dimensional consistency.
- For economics: cite realistic market parameters or historical analogies.
- isKey=true on the 1–2 most pivotal steps (where the key insight or hardest calculation occurs).
- The 'answer' field must be a complete, precise answer — not just "solve the equation".
- The 'insight' field should connect the answer to a broader concept or surprising implication.
- Do NOT wrap JSON in markdown code fences.
- domain must be one of: cs, math, physics, chemistry, biology, economics, general.
"""

# ── Top-problems system prompt ────────────────────────────────────────────────

_TOP_PROBLEMS_SYSTEM_PROMPT = """\
You are an expert STEM educator curating a "Top Problems" gallery — a showcase of the most iconic,
universally studied, and deeply insightful problems in a given field.
Return ONLY a valid JSON object — no prose, no markdown fences, no commentary.

JSON schema:
{
  "top_problems": [
    {
      "id": "<unique slug, e.g. 'fibonacci-dp'>",
      "domain": "<cs|math|physics|chemistry|biology|economics|general>",
      "title": "<famous/canonical problem name>",
      "difficulty": "<Easy|Medium|Hard|Very Hard>",
      "tag": "<sub-field tag>",
      "why_famous": "<1–2 sentences on why this problem is iconic or important>",
      "problem": "<full problem statement with real numbers — 3–5 sentences>",
      "hints": [
        "<hint 1>",
        "<hint 2>",
        "<hint 3>"
      ],
      "steps": [
        {"label": "<Step N: label>", "content": "<full derivation/reasoning>", "isKey": <true|false>}
      ],
      "answer": "<exact final answer>",
      "insight": "<2–3 sentence broader takeaway>"
    }
  ]
}

Rules:
- Generate EXACTLY 5 top/canonical problems for the requested domain.
- Choose problems that are genuinely famous or pedagogically essential in that field
  (e.g., for CS: Two Sum, LRU Cache, Dijkstra; for physics: projectile motion, Bohr model;
   for math: Basel problem, birthday paradox; for chemistry: Henderson-Hasselbalch; etc.).
- Cover a range of difficulty levels across the 5 problems.
- Each problem MUST have 3–5 well-developed steps.
- Each problem has EXACTLY 3 hints.
- Tailor language to the audience mode (kids / college / researcher).
- Do NOT wrap JSON in markdown code fences.
- domain must be one of: cs, math, physics, chemistry, biology, economics, general.
"""


def _mode_instruction(mode: str) -> str:
    if mode == "kids":
        return (
            "Audience: elementary/middle school students (ages 8-14). "
            "Use simple language, relatable examples, short sentences. "
            "Difficulty levels: Very Easy / Easy / Medium."
        )
    if mode == "researcher":
        return (
            "Audience: advanced graduate students and researchers. "
            "Include rigorous notation, edge cases, complexity analysis, "
            "and connections to active research. "
            "Difficulty levels: Medium / Hard / Very Hard."
        )
    # college (default)
    return (
        "Audience: undergraduate STEM students. "
        "Include worked-out numbers, clear notation, and intuition. "
        "Difficulty levels: Easy / Medium / Hard."
    )


# ── Shared LLM helper ─────────────────────────────────────────────────────────

async def _call_fireworks(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
) -> str:
    """Raw LLM call; returns the assistant message string."""
    api_key = os.environ.get("FIREWORKS_API_KEY", "")
    if not api_key:
        raise RuntimeError("FIREWORKS_API_KEY not set")

    payload = {
        "model": _MODEL,
        "temperature": 0.35,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }

    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            _FIREWORKS_CHAT_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()

    data = resp.json()
    raw = data["choices"][0]["message"]["content"]

    # Strip accidental markdown fences
    raw = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.MULTILINE)
    raw = re.sub(r"\n?```$", "", raw.strip(), flags=re.MULTILINE)
    return raw


def _normalise_problem(p: dict[str, Any]) -> dict[str, Any]:
    """Ensure all required fields exist and id is unique."""
    if not p.get("id"):
        p["id"] = str(uuid.uuid4())[:8]
    p.setdefault("domain", "general")
    p.setdefault("hints", [])
    p.setdefault("steps", [])
    p.setdefault("answer", "")
    p.setdefault("insight", "")
    p.setdefault("tag", "")
    p.setdefault("difficulty", "Medium")
    p.setdefault("why_famous", "")
    return p


# ── /api/problems LLM call ───────────────────────────────────────────────────

async def _call_llm(topic: str, mode: str) -> list[dict[str, Any]]:
    user_msg = (
        f"Generate 3 problems on the topic: {topic!r}.\n"
        f"{_mode_instruction(mode)}"
    )
    raw = await _call_fireworks(_SYSTEM_PROMPT, user_msg)
    parsed = json.loads(raw)
    problems = parsed.get("problems") or parsed.get("problem") or []
    if isinstance(problems, dict):
        problems = [problems]
    return [_normalise_problem(p) for p in problems]


# ── /api/top-problems LLM call + in-process cache ────────────────────────────

# Cache keyed by (domain, mode) → list of top problems
_TOP_PROBLEMS_CACHE: dict[tuple[str, str], list[dict[str, Any]]] = {}

_VALID_DOMAINS = {"cs", "math", "physics", "chemistry", "biology", "economics", "general"}

_DOMAIN_EXAMPLES: dict[str, str] = {
    "cs":         "Two Sum, Binary Search, Dijkstra's Algorithm, LRU Cache, Merge Sort",
    "math":       "Basel Problem ∑1/n², Birthday Paradox, Euler's Identity, Gaussian Integral, Fibonacci closed form",
    "physics":    "Projectile Motion, Bohr Model, Simple Harmonic Oscillator, RC Circuit decay, Special Relativity time dilation",
    "chemistry":  "Henderson-Hasselbalch equation, Hess's Law, Arrhenius equation, ideal gas law, Le Chatelier's principle",
    "biology":    "Hardy-Weinberg equilibrium, Michaelis-Menten kinetics, logistic population growth, DNA replication fidelity, PCR efficiency",
    "economics":  "Supply-demand equilibrium, Prisoner's Dilemma, Present Value, Consumer Surplus, Elasticity calculation",
    "general":    "Fermi estimation, dimensional analysis, order-of-magnitude reasoning, optimization under constraints, probability basics",
}


async def _fetch_top_problems(domain: str, mode: str) -> list[dict[str, Any]]:
    """Fetch top problems from LLM, with in-process cache."""
    key = (domain, mode)
    if key in _TOP_PROBLEMS_CACHE:
        return _TOP_PROBLEMS_CACHE[key]

    examples = _DOMAIN_EXAMPLES.get(domain, "classic, well-known problems")
    user_msg = (
        f"Generate 5 top/iconic problems for the domain: {domain!r}.\n"
        f"Classic examples to draw inspiration from (do not copy verbatim): {examples}.\n"
        f"{_mode_instruction(mode)}"
    )
    raw = await _call_fireworks(_TOP_PROBLEMS_SYSTEM_PROMPT, user_msg, max_tokens=6000)
    parsed = json.loads(raw)
    problems = parsed.get("top_problems") or parsed.get("problems") or []
    if isinstance(problems, dict):
        problems = [problems]
    result = [_normalise_problem(p) for p in problems]

    _TOP_PROBLEMS_CACHE[key] = result
    return result


def _fallback_top_problems(domain: str) -> list[dict[str, Any]]:
    """Static fallback when LLM is unavailable."""
    examples = _DOMAIN_EXAMPLES.get(domain, "classic STEM problem").split(", ")
    out = []
    difficulties = ["Easy", "Medium", "Hard", "Medium", "Hard"]
    for i, title in enumerate(examples[:5]):
        out.append({
            "id": f"top-{domain}-{i}",
            "domain": domain,
            "title": title,
            "difficulty": difficulties[i],
            "tag": domain.title(),
            "why_famous": f"{title} is one of the most studied problems in {domain}.",
            "problem": f"Solve the classic **{title}** problem with a complete worked example.",
            "hints": [
                "Think about the fundamental definition or theorem involved.",
                "Break the problem into smaller sub-problems.",
                "Check your answer against known edge cases.",
            ],
            "steps": [
                {"label": "Step 1: Set up", "content": f"Identify what {title} asks you to find.", "isKey": False},
                {"label": "Step 2: Apply method", "content": "Use the standard technique for this problem class.", "isKey": True},
                {"label": "Step 3: Verify", "content": "Check units/types and edge cases.", "isKey": False},
            ],
            "answer": f"See canonical solution for {title}.",
            "insight": f"{title} illustrates a fundamental principle that recurs across many {domain} problems.",
        })
    return out


# ── Fallback problems (used when LLM is unavailable) ─────────────────────────

def _fallback_problems(topic: str) -> list[dict[str, Any]]:
    t = topic[:40]
    return [
        {
            "id": "fb-easy",
            "domain": "general",
            "title": f"Introduction to {t}",
            "difficulty": "Easy",
            "tag": "Fundamentals",
            "why_famous": "",
            "problem": f"Define the key concept of **{t}** and give one real-world example.",
            "hints": [
                f"Think about what {t} means in everyday terms.",
                "A real-world example makes abstract ideas concrete.",
                "Focus on the most important property or definition.",
            ],
            "steps": [
                {"label": "1. Define the concept", "content": f"Write a clear one-sentence definition of {t}.", "isKey": True},
                {"label": "2. Identify key properties", "content": "List 2–3 essential characteristics.", "isKey": False},
                {"label": "3. Give a real-world example", "content": "Connect the concept to something tangible.", "isKey": True},
            ],
            "answer": f"A clear definition and one concrete example of {t}.",
            "insight": "Understanding the definition deeply is the first step to mastering any concept.",
        },
        {
            "id": "fb-medium",
            "domain": "general",
            "title": f"Applying {t}",
            "difficulty": "Medium",
            "tag": "Application",
            "why_famous": "",
            "problem": f"Explain how **{t}** is used to solve a practical problem. Describe the process step by step.",
            "hints": [
                "Start by identifying what problem needs to be solved.",
                "Break the solution into ordered steps.",
                "Verify your answer makes sense in context.",
            ],
            "steps": [
                {"label": "1. Identify the problem", "content": "State what you are trying to achieve.", "isKey": False},
                {"label": "2. Apply the concept", "content": f"Use {t} to address the problem.", "isKey": True},
                {"label": "3. Verify", "content": "Check that your result is reasonable.", "isKey": True},
            ],
            "answer": f"A step-by-step application of {t} to a practical scenario.",
            "insight": "Applying a concept to new situations reveals how deeply you understand it.",
        },
        {
            "id": "fb-hard",
            "domain": "general",
            "title": f"Advanced Analysis of {t}",
            "difficulty": "Hard",
            "tag": "Analysis",
            "why_famous": "",
            "problem": f"Compare and contrast **{t}** with a closely related concept. What are the trade-offs and limitations?",
            "hints": [
                "Find a concept that is often confused with this one.",
                "List similarities before differences.",
                "Think about edge cases or scenarios where each fails.",
            ],
            "steps": [
                {"label": "1. Identify related concept", "content": "Name the concept you will compare against.", "isKey": False},
                {"label": "2. List similarities", "content": "What do the two concepts share?", "isKey": False},
                {"label": "3. Highlight differences", "content": "Where do they diverge?", "isKey": True},
                {"label": "4. Discuss trade-offs", "content": "When should you prefer one over the other?", "isKey": True},
            ],
            "answer": f"A nuanced comparison showing when and why {t} is preferred over alternatives.",
            "insight": "True mastery means knowing not just what a concept is, but when NOT to use it.",
        },
    ]


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/api/problems")
async def generate_problems(request: Request, body: ProblemsRequest):
    """
    Returns 3 AI-generated problems for the given topic and mode.
    Fast path — no task queue, direct LLM call, ~2–4 s latency.
    """
    try:
        problems = await _call_llm(body.topic, body.mode or "college")
        return {"problems": problems}
    except Exception as exc:
        logger.warning("problems endpoint LLM call failed (%s), using fallback", exc)
        return {"problems": _fallback_problems(body.topic)}


@router.post("/api/top-problems")
async def get_top_problems(request: Request, body: TopProblemsRequest):
    """
    Returns 5 canonical/iconic problems for the given domain and mode.
    Results are cached in-process per (domain, mode) pair after the first call.
    """
    domain = body.domain.lower() if body.domain else "cs"
    if domain not in _VALID_DOMAINS:
        domain = "general"
    mode = body.mode or "college"
    try:
        problems = await _fetch_top_problems(domain, mode)
        return {"domain": domain, "mode": mode, "top_problems": problems}
    except Exception as exc:
        logger.warning("top-problems endpoint LLM call failed (%s), using fallback", exc)
        return {"domain": domain, "mode": mode, "top_problems": _fallback_top_problems(domain)}
