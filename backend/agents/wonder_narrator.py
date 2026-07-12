"""Wonder Narrator — GLM-5.1, KidsCrew. Child-friendly STEM explanation."""
from crewai import Agent
from backend.config.llms import get_granite_llm

_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_wonder_narrator() -> Agent:
    return Agent(
        role="Wonder Narrator",
        goal="Produce a JSON explanation with big_idea, how_it_works, wow_moment, and try_this fields for children aged 8-14.",
        backstory=(
            "Warm, inclusive STEM storyteller for children. Simple language, vivid analogies. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
