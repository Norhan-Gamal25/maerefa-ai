"""
Explanation tasks for all three modes.
"""
from crewai import Task
from backend.crews.parse_utils import detect_language_instruction


_JSON_PREAMBLE = (
    "RESPOND WITH RAW JSON ONLY. "
    "Do NOT write any text, explanation, analysis, or reasoning before or after the JSON. "
    "Do NOT use markdown fences. "
    "Your entire response must start with `{` and end with `}`. "
    "If you write anything else your response will be discarded.\n\n"
)


def make_kids_explanation_task(agent, safe_prompt: str, raw_prompt: str = "") -> Task:
    lang = detect_language_instruction(raw_prompt or safe_prompt)
    return Task(
        description=(
            f"{_JSON_PREAMBLE}"
            f"{lang}"
            f"Explain this STEM concept to a child (ages 8–14): '{safe_prompt}'\n\n"
            "Return exactly this JSON shape (no extra keys):\n"
            '{"big_idea":"...","how_it_works":"...","wow_moment":"...","try_this":"..."}\n\n'
            "- big_idea: one vivid, magical analogy sentence (max 25 words) that a child will remember\n"
            "- how_it_works: 6–8 sentences using relatable metaphors, everyday objects, and vivid step-by-step examples — no equations, no jargon\n"
            "- wow_moment: the single most surprising or counter-intuitive aspect (3–4 sentences that build genuine awe)\n"
            "- try_this: a concrete mental experiment with 4–5 numbered steps a child can follow right now\n"
            "IMPORTANT: No living organisms, animals, or people."
        ),
        expected_output='{"big_idea":"...","how_it_works":"...","wow_moment":"...","try_this":"..."}',
        agent=agent,
    )


def make_college_explanation_task(agent, safe_prompt: str, raw_prompt: str = "") -> Task:
    lang = detect_language_instruction(raw_prompt or safe_prompt)
    return Task(
        description=(
            f"{_JSON_PREAMBLE}"
            f"{lang}"
            f"Explain this STEM concept to a college student: '{safe_prompt}'\n\n"
            "Return exactly this JSON shape (no extra keys):\n"
            '{"concept_overview":"...","key_equations":["..."],"physical_intuition":"...","applications":["...","...","..."]}\n\n'
            "- concept_overview: 6–8 sentence technical definition covering historical origin, core assumptions, mathematical framework, and known limitations\n"
            "- key_equations: list of 4–6 LaTeX equations, each followed by a 3–4 sentence explanation of what every symbol means and when the equation applies\n"
            "- physical_intuition: 6–8 sentences explaining 'why it makes sense' with at least two concrete analogies and one worked numerical example\n"
            "- applications: exactly 6 real engineering or scientific uses, each described in 2 sentences covering what it does and why this concept is essential\n"
            "IMPORTANT: No living organisms, animals, or people."
        ),
        expected_output='{"concept_overview":"...","key_equations":[...],"physical_intuition":"...","applications":[...]}',
        agent=agent,
    )


def make_researcher_explanation_task(agent, safe_prompt: str, raw_prompt: str = "") -> Task:
    lang = detect_language_instruction(raw_prompt or safe_prompt)
    return Task(
        description=(
            f"{_JSON_PREAMBLE}"
            f"{lang}"
            f"Produce a researcher-level analysis of: '{safe_prompt}'\n\n"
            "Return exactly this JSON shape (no extra keys):\n"
            '{"state_of_knowledge":"...","research_gaps":["..."],"cross_domain_links":["..."],"research_directions":["..."],"key_references":["..."]}\n\n'
            "- state_of_knowledge: 6–8 sentences covering the current consensus, major experimental or theoretical milestones, and unresolved tensions in the literature\n"
            "- research_gaps: 6–7 specific open problems, each described in 2–3 sentences that explain why the gap exists and what solving it would unlock\n"
            "- cross_domain_links: 6 connections to other STEM or social-science fields, each with 2 sentences on how the connection manifests and why it is non-obvious\n"
            "- research_directions: 6 novel approaches worth pursuing, each with 2–3 sentences of scientific rationale and expected impact\n"
            "- key_references: 6 citation-formatted landmark papers (Author et al., Year, Venue) each with 2 sentences on their contribution and lasting influence\n"
            "IMPORTANT: No living organisms, animals, or people."
        ),
        expected_output='{"state_of_knowledge":"...","research_gaps":[...],"cross_domain_links":[...],"research_directions":[...],"key_references":[...]}',
        agent=agent,
    )
