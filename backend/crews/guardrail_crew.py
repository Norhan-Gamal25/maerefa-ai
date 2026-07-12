"""
GuardrailCrew — runs The STEM Sentinel (GLM-5.2) to validate domain,
classify mode, and craft the visual prompt.
"""
from crewai import Crew, Process
from backend.agents.sentinel import make_stem_sentinel
from backend.tasks.guardrail_task import make_guardrail_task
from backend.models.schemas import SentinelOutput


def run_guardrail_crew(prompt: str, mode_hint: str | None = None) -> SentinelOutput:
    stem_sentinel = make_stem_sentinel()
    task = make_guardrail_task(stem_sentinel, prompt, mode_hint)
    crew = Crew(
        agents=[stem_sentinel],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    )
    result = crew.kickoff()
    # CrewAI returns pydantic output directly when output_pydantic is set
    if isinstance(result.pydantic, SentinelOutput):
        parsed = result.pydantic
        # mode_hint is authoritative — never let the LLM override an explicit user selection
        if mode_hint in ("kids", "college", "researcher"):
            parsed.mode = mode_hint
        return parsed
    # Fallback: parse from raw output
    import json
    raw = result.raw if hasattr(result, "raw") else str(result)
    try:
        data = json.loads(raw)
        sentinel = SentinelOutput(**data)
        if mode_hint in ("kids", "college", "researcher"):
            sentinel.mode = mode_hint
        return sentinel
    except Exception:
        return SentinelOutput(
            mode=mode_hint or "college",
            domain="general",
            safe_prompt=prompt,
            visual_prompt=f"abstract geometric STEM visualization of {prompt}, sacred geometry, fractal patterns",
        )
