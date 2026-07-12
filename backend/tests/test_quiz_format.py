"""
test_quiz_format.py — assert quiz output has exactly 5 questions with required fields
"""
import pytest
import json
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


REQUIRED_FIELDS = {"question", "type", "options", "correct", "explanation"}

VALID_QUIZ_JSON = json.dumps({
    "questions": [
        {
            "question": f"Question {i+1}?",
            "type": "mcq",
            "options": ["A) opt1", "B) opt2", "C) opt3", "D) opt4"],
            "correct": "A",
            "explanation": f"Explanation {i+1}",
        }
        for i in range(5)
    ]
})

MISSING_FIELD_QUIZ = json.dumps({
    "questions": [
        {"question": "Q?", "type": "mcq", "options": ["A) x"], "correct": "A"}
        # missing 'explanation'
    ]
})

TOO_FEW_QUESTIONS = json.dumps({"questions": [
    {"question": "Q?", "type": "mcq", "options": ["A) x", "B) y", "C) z", "D) w"], "correct": "A", "explanation": "E"}
]})


def validate_quiz(raw_json: str) -> tuple[bool, str]:
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {e}"

    questions = data.get("questions", [])
    if len(questions) != 5:
        return False, f"Expected 5 questions, got {len(questions)}"

    for i, q in enumerate(questions):
        missing = REQUIRED_FIELDS - set(q.keys())
        if missing:
            return False, f"Question {i+1} missing fields: {missing}"
        if not isinstance(q["options"], list):
            return False, f"Question {i+1} options is not a list"

    return True, "ok"


def test_valid_quiz_passes():
    ok, msg = validate_quiz(VALID_QUIZ_JSON)
    assert ok, msg


def test_missing_field_fails():
    ok, msg = validate_quiz(MISSING_FIELD_QUIZ)
    assert not ok


def test_too_few_questions_fails():
    ok, msg = validate_quiz(TOO_FEW_QUESTIONS)
    assert not ok
    assert "5" in msg
