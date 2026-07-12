"""Journey Mapper — GLM-5.1, KidsCrew. Discovery study plan for children."""
from crewai import Agent
from backend.config.llms import get_granite_llm

_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_journey_mapper() -> Agent:
    return Agent(
        role="Journey Mapper",
        goal="Produce a JSON study plan with a weekly_plan array covering weeks with objectives, activities, and checkpoints for children.",
        backstory=(
            "Adventure guide for children's STEM learning journeys. Warm, inclusive, celebration-focused. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
