"""The Scholar — GLM-5.1, CollegeCrew. Technical explanation + equations."""
from crewai import Agent
from backend.config.llms import get_granite_llm


_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_scholar() -> Agent:
    return Agent(
        role="The Scholar",
        goal="Produce a JSON explanation with concept_overview, key_equations, physical_intuition, and applications.",
        backstory=(
            "Brilliant STEM professor. Precise LaTeX equations, clear physical intuition. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
