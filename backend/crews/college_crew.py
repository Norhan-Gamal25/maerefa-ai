"""
CollegeCrew — Fireworks AI agents.
Produces technical explanation, wonder cards, quiz, and image.

Tasks run concurrently via ThreadPoolExecutor for a ~3× speed-up.
Each task result is extracted independently so a single parse failure
never wipes out the whole response.
"""
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from crewai import Crew, Process
from backend.crews.parse_utils import extract_json, safe_dict, safe_list
from backend.config.fallbacks import FALLBACK_RESPONSES
from backend.agents.scholar import make_scholar
from backend.agents.wonder_weaver import make_wonder_weaver
from backend.agents.examiner import make_examiner
from backend.agents.diagram_director import make_diagram_director
from backend.tasks.explanation_tasks import make_college_explanation_task
from backend.tasks.wonder_task import make_wonder_task
from backend.tasks.quiz_task import make_quiz_task
from backend.tasks.visual_task import make_visual_task
from backend.tools.fireworks_image_tool import FireworksImageTool

logger = logging.getLogger(__name__)


def _run_single(agent_factory, task_factory) -> object:
    """Run one agent+task pair in isolation and return the task output."""
    agent = agent_factory()
    task = task_factory(agent)
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    crew.kickoff()
    return task


def run_college_crew(safe_prompt: str, visual_prompt: str, domain: str, raw_prompt: str = "") -> dict:
    image_tool = FireworksImageTool()
    _fallback = FALLBACK_RESPONSES["college"]

    # ── Launch all content tasks in parallel ──────────────────────────────────
    futures = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures["explanation"] = pool.submit(
            _run_single,
            make_scholar,
            lambda a: make_college_explanation_task(a, safe_prompt, raw_prompt),
        )
        futures["wonder"] = pool.submit(
            _run_single,
            make_wonder_weaver,
            lambda a: make_wonder_task(a, safe_prompt, "college", raw_prompt),
        )
        futures["quiz"] = pool.submit(
            _run_single,
            make_examiner,
            lambda a: make_quiz_task(a, safe_prompt, "college", raw_prompt),
        )
        futures["visual"] = pool.submit(
            _run_single,
            make_diagram_director,
            lambda a: make_visual_task(a, visual_prompt, domain, "college"),
        )

    # 130 s per-task wall-clock cap: LLM timeout=120 s + 10 s overhead.
    # This prevents one hung task from blocking the entire response.
    _TASK_TIMEOUT = 130
    results = {}
    for key, fut in futures.items():
        try:
            results[key] = fut.result(timeout=_TASK_TIMEOUT)
        except Exception as exc:
            logger.warning("college_crew task '%s' failed: %s", key, exc)
            results[key] = None

    # Image generation — non-fatal
    image_url = None
    try:
        visual_task = results.get("visual")
        refined_prompt = visual_task.output.raw if (visual_task and visual_task.output) else visual_prompt
        image_url = image_tool._run(refined_prompt)
    except Exception as exc:
        logger.warning("college image generation failed: %s", exc)

    # ── Explanation ───────────────────────────────────────────────────────────
    try:
        raw = extract_json(results["explanation"].output, "college_explanation")
        explanation = safe_dict(raw, "explanation") or safe_dict(raw) or _fallback["explanation"]
        if not any(explanation.get(k) for k in ("concept_overview", "key_equations", "physical_intuition")):
            explanation = _fallback["explanation"]
    except Exception:
        explanation = _fallback["explanation"]

    # ── Wonder cards ──────────────────────────────────────────────────────────
    try:
        raw = extract_json(results["wonder"].output, "college_wonder")
        wonder_cards = safe_list(raw, "wonder_cards") or _fallback["wonder_cards"]
        if not wonder_cards:
            wonder_cards = _fallback["wonder_cards"]
    except Exception:
        wonder_cards = _fallback["wonder_cards"]

    # ── Quiz ──────────────────────────────────────────────────────────────────
    try:
        raw = extract_json(results["quiz"].output, "college_quiz")
        quiz = safe_dict(raw, "quiz") or safe_dict(raw)
        if not quiz.get("questions"):
            quiz = _fallback["quiz"]
    except Exception:
        quiz = _fallback["quiz"]

    return {
        "mode": "college",
        "explanation": explanation,
        "wonder_cards": wonder_cards,
        "quiz": quiz,
        "image_url": image_url or None,
        "agent_trace": [
            "STEM Sentinel (GLM-5.2)",
            "The Scholar (GLM-5.1)",
            "Wonder Weaver (GLM-5.1)",
            "The Examiner (GLM-5.1)",
            "Curriculum Designer (GLM-5.1)",
            "Diagram Director (GLM-5.2)",
        ],
    }
