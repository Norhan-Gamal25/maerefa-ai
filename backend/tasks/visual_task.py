"""
Visual prompt refinement task.
"""
from crewai import Task


def make_visual_task(agent, visual_prompt: str, domain: str, mode: str) -> Task:
    style_notes = {
        "kids": "vibrant, colorful, whimsical — rainbow palette, glowing geometric shapes",
        "college": "technically precise, clean — scientific diagram aesthetic, muted palette with accent colors",
        "researcher": "abstract, data-driven — network graphs, topological surfaces, spectral heat maps",
    }.get(mode, "geometric, abstract, aniconic")

    return Task(
        description=(
            f"Refine and enhance this SDXL image prompt for the '{mode}' mode:\n"
            f"'{visual_prompt}'\n\n"
            f"Domain: {domain}\n"
            f"Style requirements: {style_notes}\n\n"
            "Rules:\n"
            "- Describe ONLY geometric patterns, fractals, crystals, field lines, circuits, or abstract data visualizations\n"
            "- NEVER include living beings, people, animals, or organic forms\n"
            "- Add specific artistic style keywords: photorealistic, octane render, 8k, etc.\n"
            "- Keep the prompt under 200 words\n\n"
            "Return ONLY the refined prompt text (no JSON, no explanation)."
        ),
        expected_output="A refined SDXL prompt string describing aniconic geometric/abstract STEM art",
        agent=agent,
    )
