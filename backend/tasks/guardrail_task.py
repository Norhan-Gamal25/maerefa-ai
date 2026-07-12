"""
Guardrail task — validates STEM domain and classifies mode.
Language-aware: detects the user's language and instructs the sentinel to
preserve the detected language for downstream crews.
"""
from crewai import Task
from backend.models.schemas import SentinelOutput
from backend.crews.parse_utils import detect_language


def make_guardrail_task(agent, prompt: str, mode_hint: str | None = None) -> Task:
    if mode_hint in ("kids", "college", "researcher"):
        mode_instruction = (
            f"The user has explicitly selected mode: '{mode_hint}'. "
            "You MUST use exactly this value for the mode field — do not override it."
        )
    else:
        mode_instruction = (
            "Classify the intended audience mode:\n"
            "   - 'kids': request sounds elementary, uses simple words, or mentions children\n"
            "   - 'college': technical language, equations, engineering context\n"
            "   - 'researcher': mentions research gaps, papers, frontier topics, PhD-level\n"
            "   - default to 'college' if unclear"
        )

    lang = detect_language(prompt)
    lang_note = (
        f"\nNOTE: The user's question is in {lang}. "
        "Rewrite safe_prompt preserving the original language intent."
        if lang != "English"
        else ""
    )

    return Task(
        description=(
            f"Analyze this request: '{prompt}'\n\n"
            "SAFETY CHECK (do this first):\n"
            "If the request involves ANY of the following, you MUST set blocked=true and provide a block_reason:\n"
            "  - Illegal drug synthesis or production (cocaine, heroin, meth, fentanyl, etc.)\n"
            "  - Weapons, explosives, or chemical/biological warfare agents\n"
            "  - Malware, hacking tools, or cyberattacks\n"
            "  - Self-harm or violence\n"
            "  - Any content that is dangerous, illegal, or unethical\n"
            "When blocked=true, set safe_prompt='', visual_prompt=''.\n\n"
            f"1. Confirm it is within approved STEM domains: Mathematics, Physics, Chemistry, Computer Science.\n"
            f"2. {mode_instruction}\n"
            "3. Rewrite the prompt into an aniconic-safe version (no living beings)."
            f"{lang_note}\n"
            "4. Craft an SDXL image generation prompt showing only geometric patterns, fractals, "
            "or abstract structures relevant to the STEM domain — NO living beings.\n\n"
            "Return ONLY valid JSON matching SentinelOutput schema: "
            "{mode, domain, safe_prompt, visual_prompt, blocked, block_reason}"
        ),
        expected_output='Valid JSON: {"mode": "...", "domain": "...", "safe_prompt": "...", "visual_prompt": "...", "blocked": false, "block_reason": ""}',
        agent=agent,
        output_pydantic=SentinelOutput,
    )
