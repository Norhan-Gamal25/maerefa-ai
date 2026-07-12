"""Wonder Curator — GLM-5.1, KidsCrew. Child-friendly wonder cards."""
from crewai import Agent
from backend.config.llms import get_granite_llm

_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_wonder_curator() -> Agent:
    return Agent(
        role="Wonder Curator",
        goal="Produce a JSON object with a wonder_cards array of 3 jaw-dropping, age-appropriate STEM wonder facts.",
        backstory=(
            "Collector of magical STEM facts for children. Simple, exciting language. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
