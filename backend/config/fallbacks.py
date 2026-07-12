"""
Fallback responses for all three modes.
Used when a crew fails (API down, timeout, parse error, etc.)
Each fallback must be a complete, display-ready response.
"""

FALLBACK_RESPONSES: dict[str, dict] = {
    "kids": {
        "mode": "kids",
        "explanation": {
            "big_idea": "Our AI helpers are taking a short break — please try again in a moment!",
            "how_it_works": "Sometimes our AI agents need a moment to rest. Your question was great and we want to answer it properly — just hit the button again!",
            "wow_moment": "Did you know? Every time you ask a question, you're thinking like a scientist!",
            "try_this": "While you wait, think about what you already know about the topic — what would you guess the answer is?",
        },
        "wonder_cards": [],
        "quiz": {"questions": []},
        "image_url": None,
        "agent_trace": ["STEM Sentinel (GLM-5.2)", "Wonder Narrator (GLM-5.1)", "Quiz Elf (GLM-5.1)"],
    },

    "college": {
        "mode": "college",
        "explanation": {
            "concept_overview": "Our AI agents are temporarily unavailable. Please try again in a moment — your question was received.",
            "key_equations": ["Retry your request to receive LaTeX-formatted equations for this topic"],
            "physical_intuition": "The backend encountered an issue processing your request. This is a temporary error — please retry.",
            "applications": ["Retry your request", "Check your internet connection", "Try a slightly different phrasing"],
        },
        "wonder_cards": [],
        "quiz": {"questions": []},
        "image_url": None,
        "agent_trace": ["STEM Sentinel (GLM-5.2)", "The Scholar (GLM-5.1)", "The Examiner (GLM-5.1)"],
    },

    "researcher": {
        "mode": "researcher",
        "explanation": {
            "state_of_knowledge": "Our AI research agents are temporarily unavailable. Please retry your request in a moment.",
            "research_gaps": ["Unable to generate topic-specific research gaps at this time — please retry"],
            "cross_domain_links": ["Retry your request to get domain-specific cross-field connections"],
            "research_directions": ["Retry to receive AI-generated research directions for your topic"],
            "key_references": ["Retry your request to receive relevant literature references"],
        },
        "wonder_cards": [],
        "quiz": {"questions": []},
        "image_url": None,
        "agent_trace": ["STEM Sentinel (GLM-5.2)", "Research Analyst (GLM-5.1)", "Frontier Scout (GLM-5.1)"],
    },
}
