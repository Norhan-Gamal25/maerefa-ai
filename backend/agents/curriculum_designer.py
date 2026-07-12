"""Curriculum Designer — GLM-5.1, CollegeCrew. 8-week semester study plan."""
from crewai import Agent
from backend.config.llms import get_granite_llm


_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_curriculum_designer() -> Agent:
    return Agent(
        role="Curriculum Designer",
        goal="Produce a JSON study plan with a weekly_plan array covering weeks with objectives, core_topics, activities, and checkpoints.",
        backstory=(
            "Academic curriculum expert. Logical week-by-week progression with clear prerequisites. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
