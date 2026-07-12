"""
Wonder card tasks for all three modes.
"""
from crewai import Task
from backend.crews.parse_utils import detect_language_instruction
from backend.tasks.explanation_tasks import _JSON_PREAMBLE


def make_wonder_task(agent, safe_prompt: str, mode: str, raw_prompt: str = "") -> Task:
    lang = detect_language_instruction(raw_prompt or safe_prompt)
    if mode == "kids":
        instructions = (
            "4 jaw-dropping age-appropriate facts using simple vocabulary. "
            "Each fact must be 2–3 vivid sentences that feel magical and make the child say 'wow!'. "
            "Include at least one surprising number or scale comparison."
        )
    elif mode == "college":
        instructions = (
            "4 mind-bending college-level facts that challenge intuition or reveal unexpected connections. "
            "Each fact must be 2–3 sentences referencing a specific real phenomenon, experiment, or equation. "
            "Include at least one counter-intuitive result that defies everyday experience."
        )
    else:  # researcher
        instructions = (
            "4 frontier facts citing specific experimental or theoretical findings from the past decade. "
            "Each fact must be 3–4 sentences covering: what was found, why it surprised the field, "
            "and what open question it raises. Reference a specific paper, result, or dataset where possible."
        )

    return Task(
        description=(
            f"{_JSON_PREAMBLE}"
            f"{lang}"
            f"Topic: '{safe_prompt}'\n\n"
            f"Generate {instructions}\n\n"
            "Return exactly this JSON shape (4 cards):\n"
            '{"wonder_cards":[{"emoji":"...","fact":"..."},{"emoji":"...","fact":"..."},{"emoji":"...","fact":"..."},{"emoji":"...","fact":"..."}]}\n\n'
            "IMPORTANT: No living organisms, animals, or people."
        ),
        expected_output='{"wonder_cards":[{"emoji":"...","fact":"..."},{"emoji":"...","fact":"..."},{"emoji":"...","fact":"..."},{"emoji":"...","fact":"..."}]}',
        agent=agent,
    )
