"""Research Analyst — GLM-5.1, ResearcherCrew. Cross-domain gap analysis."""
from crewai import Agent
from backend.config.llms import get_granite_llm

_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_research_analyst() -> Agent:
    return Agent(
        role="Research Analyst",
        goal="Produce a JSON research analysis with state_of_knowledge, research_gaps, cross_domain_links, research_directions, and key_references.",
        backstory=(
            "Senior STEM research analyst. Grounded in recent literature. "
            "Precise, evidence-based. Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
