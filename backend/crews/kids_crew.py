"""
KidsCrew — Fireworks AI agents.
Produces child-friendly explanation, wonder cards, quiz, study plan, and image.

Tasks run concurrently via ThreadPoolExecutor for a ~4× speed-up.
Each task result is extracted independently so a single parse failure
never wipes out the whole response.
"""
import logging
from concurrent.futures import ThreadPoolExecutor
from crewai import Crew, Process
from backend.crews.parse_utils import extract_json, safe_dict, safe_list
from backend.config.fallbacks import FALLBACK_RESPONSES
from backend.agents.wonder_narrator import make_wonder_narrator
from backend.agents.wonder_curator import make_wonder_curator
from backend.agents.quiz_elf import make_quiz_elf
from backend.agents.art_whisperer import make_art_whisperer
from backend.tasks.explanation_tasks import make_kids_explanation_task
from backend.tasks.wonder_task import make_wonder_task
from backend.tasks.quiz_task import make_quiz_task
from backend.tasks.visual_task import make_visual_task
from backend.tools.fireworks_image_tool import FireworksImageTool

logger = logging.getLogger(__name__)


def _run_single(agent_factory, task_factory) -> object:
    """Run one agent+task pair in isolation and return the task."""
    agent = agent_factory()
    task = task_factory(agent)
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    crew.kickoff()
    return task


def run_kids_crew(safe_prompt: str, visual_prompt: str, domain: str, raw_prompt: str = "") -> dict:
    image_tool = FireworksImageTool()
    _fallback = FALLBACK_RESPONSES["kids"]

    # ── Launch all content tasks in parallel ──────────────────────────────────
    # max_workers=2 to stay within Railway/Render free-tier memory limits (512 MB).
    futures = {}
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures["explanation"] = pool.submit(
            _run_single,
            make_wonder_narrator,
            lambda a: make_kids_explanation_task(a, safe_prompt, raw_prompt),
        )
        futures["wonder"] = pool.submit(
            _run_single,
            make_wonder_curator,
            lambda a: make_wonder_task(a, safe_prompt, "kids", raw_prompt),
        )
        futures["quiz"] = pool.submit(
            _run_single,
            make_quiz_elf,
            lambda a: make_quiz_task(a, safe_prompt, "kids", raw_prompt),
        )
        futures["visual"] = pool.submit(
            _run_single,
            make_art_whisperer,
            lambda a: make_visual_task(a, visual_prompt, domain, "kids"),
        )

    # 130 s per-task wall-clock cap: LLM timeout=120 s + 10 s overhead.
    # This prevents one hung task from blocking the entire response.
    _TASK_TIMEOUT = 130
    results = {}
    for key, fut in futures.items():
        try:
            results[key] = fut.result(timeout=_TASK_TIMEOUT)
        except Exception as exc:
            logger.warning("kids_crew task '%s' failed: %s", key, exc)
            results[key] = None

    # Image generation — non-fatal
    image_url = None
    try:
        visual_task = results.get("visual")
        refined_prompt = visual_task.output.raw if (visual_task and visual_task.output) else visual_prompt
        image_url = image_tool._run(refined_prompt)
    except Exception as exc:
        logger.warning("kids image generation failed: %s", exc)

    # ── Explanation ───────────────────────────────────────────────────────────
    try:
        raw = extract_json(results["explanation"].output, "kids_explanation")
        explanation = safe_dict(raw, "explanation") or safe_dict(raw) or _fallback["explanation"]
        if not any(explanation.get(k) for k in ("big_idea", "how_it_works", "wow_moment")):
            explanation = _fallback["explanation"]
    except Exception:
        explanation = _fallback["explanation"]

    # ── Wonder cards ──────────────────────────────────────────────────────────
    try:
        raw = extract_json(results["wonder"].output, "kids_wonder")
        wonder_cards = safe_list(raw, "wonder_cards") or _fallback["wonder_cards"]
        if not wonder_cards:
            wonder_cards = _fallback["wonder_cards"]
    except Exception:
        wonder_cards = _fallback["wonder_cards"]

    # ── Quiz ──────────────────────────────────────────────────────────────────
    try:
        raw = extract_json(results["quiz"].output, "kids_quiz")
        quiz = safe_dict(raw, "quiz") or safe_dict(raw)
        if not quiz.get("questions"):
            quiz = _fallback["quiz"]
    except Exception:
        quiz = _fallback["quiz"]

    return {
        "mode": "kids",
        "explanation": explanation,
        "wonder_cards": wonder_cards,
        "quiz": quiz,
        "image_url": image_url or None,
        "agent_trace": [
            "STEM Sentinel (GLM-5.2)",
            "Wonder Narrator (GLM-5.1)",
            "Wonder Curator (GLM-5.1)",
            "Quiz Elf (GLM-5.1)",
            "Journey Mapper (GLM-5.1)",
            "Art Whisperer (GLM-5.2)",
        ],
    }
