"""
Study plan tasks for all three modes.
"""
from crewai import Task
from backend.crews.parse_utils import detect_language_instruction
from backend.tasks.explanation_tasks import _JSON_PREAMBLE


def make_study_plan_task(agent, safe_prompt: str, mode: str, raw_prompt: str = "") -> Task:
    lang = detect_language_instruction(raw_prompt or safe_prompt)
    if mode == "kids":
        weeks = 4
        style = "discovery journey for children (ages 8–14), fun hands-on activities and gentle checkpoints"
        activity_guidance = "Each week: 3 specific activities (e.g. draw, build, measure) and 1 challenge question."
        hours_range = "2–3"
    elif mode == "college":
        weeks = 6
        style = "semester roadmap for college students, covering theory, problem sets, and applied projects"
        activity_guidance = "Each week: 3 activities (e.g. read chapter, solve problems, implement or simulate) and 1 timed checkpoint quiz."
        hours_range = "4–6"
    else:  # researcher
        weeks = 8
        style = "research roadmap with experiment phases, publication milestones, and peer-review targets"
        activity_guidance = "Each week: 3 high-level research activities (e.g. run experiments, write section, submit preprint) and 1 measurable milestone."
        hours_range = "8–12"

    week_list = ", ".join(str(w) for w in range(1, weeks + 1))
    schema = (
        f'{{"title":"...","total_weeks":{weeks},"prerequisites":["...","...","..."],'
        f'"weekly_plan":[{{"week":1,"title":"...","objectives":["...","...","..."],'
        f'"core_topics":["...","...","..."],"activities":["...","...","..."],'
        f'"checkpoint":"...","estimated_hours":{hours_range.split("–")[0]}}},'
        f'...repeat for weeks {week_list}],"final_milestone":"..."}}'
    )
    return Task(
        description=(
            f"{_JSON_PREAMBLE}"
            f"{lang}"
            f"Topic: '{safe_prompt}'\n\n"
            f"BUILD THE ENTIRE STUDY PLAN ABOUT '{safe_prompt}' ONLY — do NOT drift to unrelated subjects.\n"
            f"Every week title, objective, topic, activity, and checkpoint MUST be specifically about '{safe_prompt}'.\n\n"
            f"Generate a COMPLETE {weeks}-week {style}.\n"
            f"weekly_plan MUST contain EXACTLY {weeks} objects — weeks {week_list}.\n"
            f"{activity_guidance}\n"
            f"Each week must have 3 objectives, 3 core_topics, and 3 activities. estimated_hours: {hours_range}.\n\n"
            f"Schema:\n{schema}\n\n"
            f"IMPORTANT: No living organisms, animals, or people."
        ),
        expected_output=f'JSON study plan about {safe_prompt!r} with exactly {weeks} entries in weekly_plan',
        agent=agent,
    )
