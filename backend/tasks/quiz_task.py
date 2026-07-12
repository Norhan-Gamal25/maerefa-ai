"""
Quiz tasks for all three modes.
"""
from crewai import Task
from backend.crews.parse_utils import detect_language_instruction
from backend.tasks.explanation_tasks import _JSON_PREAMBLE


def make_quiz_task(agent, safe_prompt: str, mode: str, raw_prompt: str = "") -> Task:
    lang = detect_language_instruction(raw_prompt or safe_prompt)
    if mode == "kids":
        style = (
            "8 fun MCQ questions, 4 options each (A/B/C/D) with emoji hints. "
            "Vary the question style: some ask 'which is correct', some ask 'which is wrong', "
            "some use fill-in-the-blank, some use real-world analogies. "
            "Each question must test genuine understanding (not just memory). "
            "Explanation: 2–3 encouraging sentences that explain why the right answer is correct "
            "and why each wrong option is plausible but incorrect. "
            "type='mcq', correct='A'|'B'|'C'|'D'."
        )
    elif mode == "college":
        style = (
            "8 questions: 4 conceptual MCQ + 2 multi-step calculation + 1 short-answer derivation + 1 tricky edge-case MCQ. "
            "MCQ: options=[\"A) ...\",\"B) ...\",\"C) ...\",\"D) ...\"], correct=\"A\"|\"B\"|\"C\"|\"D\", "
            "explanation=3–4 sentences covering why the answer is correct and why distractors are wrong. "
            "Calculation: options=[], correct=exact numeric answer with units, "
            "explanation=full step-by-step solution with intermediate values and units at every step. "
            "Derivation: options=[], correct=key equation or result, "
            "explanation=3–4 sentence derivation outline. "
            "Edge-case MCQ: a question designed to catch common misconceptions about the topic."
        )
    else:  # researcher
        style = (
            "8 open-ended synthesis questions requiring cross-domain reasoning and critical analysis. "
            "Cover: 2 conceptual-depth questions, 2 compare-and-contrast questions, 2 edge-case / limitation questions, "
            "1 question connecting this topic to an active research frontier, and 1 design/application challenge. "
            "type='open-ended', options=[], correct=a detailed model-answer outline (4–5 key points), "
            "explanation=3–4 sentences on why this question is non-trivial and what a strong answer looks like."
        )

    return Task(
        description=(
            f"TOPIC: {safe_prompt!r}\n"
            f"YOU ARE WRITING A QUIZ EXCLUSIVELY ABOUT: {safe_prompt!r}\n"
            f"EVERY SINGLE QUESTION MUST BE SPECIFICALLY ABOUT {safe_prompt!r}.\n"
            f"DO NOT write questions about any other subject.\n\n"
            f"{_JSON_PREAMBLE}"
            f"{lang}"
            f"Generate {style}\n\n"
            "Return exactly this JSON shape:\n"
            '{"questions":[{"question":"...","type":"mcq","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."}]}\n\n'
            "IMPORTANT: No living organisms, animals, or people."
        ),
        expected_output=f'JSON quiz with all questions specifically about {safe_prompt!r}',
        agent=agent,
    )
