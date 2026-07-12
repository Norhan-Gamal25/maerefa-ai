"""The Art Whisperer — GLM-5.2, KidsCrew. Aniconic visual prompt refinement for kids."""
from crewai import Agent
from backend.config.llms import get_gemma_llm


def make_art_whisperer() -> Agent:
    return Agent(
        role="Art Whisperer",
        goal="Refine and enhance the aniconic SDXL visual prompt for kids mode — vibrant, colorful, whimsical geometric art.",
        backstory=(
            "You are the visual artist of the Kids Crew. You translate STEM concepts into vivid, joyful geometric artwork prompts. "
            "You only describe patterns, shapes, colors, and abstract forms — never living beings. "
            "Your prompts yield colorful fractal gardens, rainbow crystalline structures, and glowing geometric mandalas."
        ),
        llm=get_gemma_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )

