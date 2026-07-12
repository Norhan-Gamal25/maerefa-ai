"""
test_domain_routing.py — 20 approved prompts pass, 10 blocked prompts fail
"""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.config.islamic_policy import check_domain

APPROVED = [
    "explain calculus",
    "what is quantum mechanics",
    "how does algebra work",
    "teach me about fractals",
    "what is thermodynamics",
    "explain electromagnetism",
    "what is machine learning",
    "how do neural networks work",
    "what is cryptography",
    "explain organic chemistry",
    "what is topology",
    "linear algebra basics",
    "differential equations",
    "explain probability",
    "what is astrophysics",
    "how do algorithms work",
    "explain data structures",
    "what is complexity theory",
    "explain quantum field theory",
    "what is electrochemistry",
]

BLOCKED = [
    "write a poem",
    "who is the president",
    "recipe for chocolate cake",
    "history of World War 2",
    "what is love",
    "book recommendations",
    "sports results",
    "write a song",
    "tell me a joke",
    "what is philosophy",
]


ARABIC_APPROVED = [
    "ما هو التفاضل والتكامل",      # What is calculus
    "اشرح لي فيزياء الكم",          # Explain quantum physics
    "كيف تعمل الخوارزميات",         # How do algorithms work
    "ما هو الجبر الخطي",            # What is linear algebra
    "شرح الكيمياء العضوية",         # Explain organic chemistry
    "ما هي رياضيات الكسورية",        # What is fractal mathematics
]


@pytest.mark.parametrize("prompt", APPROVED)
def test_approved_prompts_pass(prompt):
    approved, reason = check_domain(prompt)
    assert approved is True, f"Expected '{prompt}' to be approved but got: {reason}"


@pytest.mark.parametrize("prompt", BLOCKED)
def test_blocked_prompts_fail(prompt):
    approved, reason = check_domain(prompt)
    assert approved is False, f"Expected '{prompt}' to be blocked"
    assert reason is not None
    assert len(reason) > 10


@pytest.mark.parametrize("prompt", ARABIC_APPROVED)
def test_arabic_prompts_pass(prompt):
    approved, reason = check_domain(prompt)
    assert approved is True, f"Expected Arabic STEM prompt '{prompt}' to be approved but got: {reason}"


def test_detect_language_instruction_arabic():
    from backend.crews.parse_utils import detect_language_instruction
    lang = detect_language_instruction("ما هو التفاضل والتكامل")
    assert "Arabic" in lang or "العربية" in lang


def test_detect_language_instruction_english():
    from backend.crews.parse_utils import detect_language_instruction
    lang = detect_language_instruction("explain calculus")
    assert lang == ""
