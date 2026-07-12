"""The Examiner — GLM-5.1, CollegeCrew. College-level quiz (MCQ + calculation)."""
from crewai import Agent
from backend.config.llms import get_granite_llm


_NO_PREAMBLE = "You output raw JSON only — never any prose, reasoning, or markdown before or after the JSON object."


def make_examiner() -> Agent:
    return Agent(
        role="The Examiner",
        goal=(
            "Produce a JSON object with a questions array of quiz questions (MCQ and calculation). "
            "Every question must be exclusively about the specific topic stated at the top of the task — never about unrelated STEM topics."
        ),
        backstory=(
            "Rigorous exam designer who always reads the topic at the top of the task first and writes every question about that exact topic. "
            "Fair, accurate questions with step-by-step solutions. "
            "Never references living organisms or people. "
            + _NO_PREAMBLE
        ),
        llm=get_granite_llm(),
        max_iter=2,
        max_rpm=10,
        verbose=False,
    )
