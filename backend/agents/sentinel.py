"""The STEM Sentinel — GLM-5.2, GuardrailCrew. Domain validator + mode classifier + visual prompt crafter."""
from crewai import Agent
from backend.config.llms import get_gemma_llm


def make_stem_sentinel() -> Agent:
    return Agent(
        role="STEM Sentinel",
        goal=(
            "Validate that the user's request is within approved STEM domains, "
            "classify the audience mode, and craft an aniconic visual generation prompt."
        ),
        backstory=(
            "You are the guardian of Maerefa Online. Every question passes through you first. "
            "You speak with calm authority, ensuring only Mathematics, Physics, Chemistry, "
            "and Computer Science topics proceed. You understand aniconic art principles "
            "respected across many cultures and traditions — including Islamic aniconism — "
            "and always craft visual prompts that depict only geometric patterns, fractals, "
            "abstract structures, and symbolic representations — never living beings."
        ),
        llm=get_gemma_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )

