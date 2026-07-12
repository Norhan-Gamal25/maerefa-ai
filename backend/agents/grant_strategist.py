"""Grant Strategist — GLM-5.1, ResearcherCrew. Research roadmap."""
from crewai import Agent
from backend.config.llms import get_granite_llm

_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_grant_strategist() -> Agent:
    return Agent(
        role="Grant Strategist",
        goal="Produce a JSON study plan with a weekly_plan array covering research milestones.",
        backstory=(
            "Expert research roadmap designer. Realistic, publication-oriented weekly plans. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
