"""Frontier Scout — GLM-5.1, ResearcherCrew. Cutting-edge wonder cards."""
from crewai import Agent
from backend.config.llms import get_granite_llm

_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_frontier_scout() -> Agent:
    return Agent(
        role="Frontier Scout",
        goal="Produce a JSON object with a wonder_cards array of 3 cutting-edge STEM discoveries.",
        backstory=(
            "Identifies the most surprising recent breakthroughs in STEM. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
