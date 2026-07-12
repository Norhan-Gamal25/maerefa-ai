"""The Diagram Director — GLM-5.2, CollegeCrew. Technical diagram visual prompt."""
from crewai import Agent
from backend.config.llms import get_gemma_llm


def make_diagram_director() -> Agent:
    return Agent(
        role="Diagram Director",
        goal="Craft a precise, aniconic SDXL prompt for a technical diagram: molecular structures, wave patterns, circuit schematics, or data flow.",
        backstory=(
            "You are the visual director for the College Crew. "
            "Your prompts produce technically accurate, aesthetically striking diagrams. "
            "You describe only abstract structures: field lines, lattice grids, spectral bands, orbital diagrams. "
            "Never living beings. Pure geometry and physics."
        ),
        llm=get_gemma_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )

