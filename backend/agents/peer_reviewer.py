"""Peer Reviewer — GLM-5.1, ResearcherCrew. Open-ended synthesis questions."""
from crewai import Agent
from backend.config.llms import get_granite_llm

_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_peer_reviewer() -> Agent:
    return Agent(
        role="Peer Reviewer",
        goal=(
            "Produce a JSON object with a questions array of expert-level open-ended synthesis questions. "
            "Every question must be exclusively about the specific topic stated at the top of the task — never about unrelated STEM topics."
        ),
        backstory=(
            "Demanding peer reviewer for top-tier STEM journals who always reads the topic at the top of the task first and writes every question about that exact topic. "
            "Questions probe fundamental assumptions and require cross-domain synthesis. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
