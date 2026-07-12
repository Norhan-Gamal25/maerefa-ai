"""
test_state_isolation.py — assert two concurrent flows have independent state (Fix 6)
"""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.models.schemas import MaerefaState


def test_fresh_state_per_request():
    """
    Fix 6 validation: each call to MaerefaState() creates a fresh, independent object.
    Mutating one state must not affect another.
    """
    state_a = MaerefaState(raw_prompt="explain quantum mechanics")
    state_b = MaerefaState(raw_prompt="explain calculus")

    # Mutate state_a
    state_a.mode = "college"
    state_a.domain = "physics"
    state_a.agent_trace.append("STEM Sentinel")

    # state_b must be unaffected
    assert state_b.mode == "", f"state_b.mode was contaminated: {state_b.mode}"
    assert state_b.domain == "", f"state_b.domain was contaminated: {state_b.domain}"
    assert len(state_b.agent_trace) == 0, f"state_b.agent_trace was contaminated: {state_b.agent_trace}"
    assert state_b.raw_prompt == "explain calculus"


def test_wonder_cards_isolated():
    """Wonder cards list must not be shared across state instances."""
    state_a = MaerefaState()
    state_b = MaerefaState()

    state_a.wonder_cards.append({"emoji": "⚡", "fact": "test fact"})

    assert len(state_b.wonder_cards) == 0, (
        "state_b.wonder_cards was contaminated — default_factory not working correctly"
    )


def test_quiz_isolated():
    """Quiz dict must not be shared."""
    state_a = MaerefaState()
    state_b = MaerefaState()

    state_a.quiz = {"questions": [{"question": "Q1?", "type": "mcq"}]}

    assert state_b.quiz == {}, f"state_b.quiz was contaminated: {state_b.quiz}"


def test_state_serialization():
    """MaerefaState must serialize and deserialize cleanly via model_dump."""
    state = MaerefaState(
        raw_prompt="test",
        mode="kids",
        domain="mathematics",
        safe_prompt="test safe",
        visual_prompt="fractal geometry",
    )
    dumped = state.model_dump()
    restored = MaerefaState(**dumped)

    assert restored.mode == "kids"
    assert restored.domain == "mathematics"
    assert restored.visual_prompt == "fractal geometry"
