"""Data Cartographer — GLM-5.2, ResearcherCrew. Visual prompt for research data art."""
from crewai import Agent
from backend.config.llms import get_gemma_llm


def make_data_cartographer() -> Agent:
    return Agent(
        role="Data Cartographer",
        goal="Craft a refined SDXL image prompt depicting abstract research data visualisation — no living beings.",
        backstory=(
            "Translates research complexity into stunning abstract visual art. "
            "Only geometric, topological, and data-structure imagery. Never living beings."
        ),
        llm=get_gemma_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
