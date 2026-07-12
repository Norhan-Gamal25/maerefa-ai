"""Wonder Weaver — GLM-5.1, CollegeCrew. Mind-bending wonder cards for college."""
from crewai import Agent
from backend.config.llms import get_granite_llm


_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_wonder_weaver() -> Agent:
    return Agent(
        role="Wonder Weaver",
        goal="Produce a JSON object with a wonder_cards array of 3 mind-bending college-level STEM facts.",
        backstory=(
            "Curates counterintuitive, technically accurate STEM phenomena. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
