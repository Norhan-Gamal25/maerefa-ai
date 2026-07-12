"""
Shared JSON parsing utility for all crew output parsers.

LLMs often wrap JSON in markdown code fences or add preamble text.
extract_json() handles all common patterns before falling back to {}.
"""
import json
import re
import logging

logger = logging.getLogger(__name__)

# Unicode ranges for non-Latin script detection
_ARABIC_RE    = re.compile(r'[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]')  # Arabic + extended
_HEBREW_RE    = re.compile(r'[\u0590-\u05FF]')
_CHINESE_RE   = re.compile(r'[\u4E00-\u9FFF\u3400-\u4DBF]')
_JAPANESE_RE  = re.compile(r'[\u3040-\u309F\u30A0-\u30FF]')
_KOREAN_RE    = re.compile(r'[\uAC00-\uD7AF\u1100-\u11FF]')
_DEVANAGARI_RE= re.compile(r'[\u0900-\u097F]')   # Hindi, Sanskrit
_CYRILLIC_RE  = re.compile(r'[\u0400-\u04FF]')   # Russian, Ukrainian, etc.
_THAI_RE      = re.compile(r'[\u0E00-\u0E7F]')
_LATIN_RE     = re.compile(r'[a-zA-Z]')


def detect_language(text: str) -> str:
    """
    Returns the detected language name (English by default).
    Used to instruct the LLM to respond in the user's language.
    """
    if _ARABIC_RE.search(text):
        return "Arabic"
    if _CHINESE_RE.search(text):
        return "Chinese"
    if _JAPANESE_RE.search(text):
        return "Japanese"
    if _KOREAN_RE.search(text):
        return "Korean"
    if _DEVANAGARI_RE.search(text):
        return "Hindi"
    if _CYRILLIC_RE.search(text):
        return "Russian"
    if _HEBREW_RE.search(text):
        return "Hebrew"
    if _THAI_RE.search(text):
        return "Thai"
    return "English"


def detect_language_instruction(text: str) -> str:
    """
    Returns a task instruction line telling the LLM what language to respond in.
    For Arabic, uses bilingual mode: Arabic text with the English term inline
    (e.g. "النماذج القوية (robust models)") so technical terms stay clear.
    For other non-English languages, full translation is requested.
    Otherwise returns an empty string (default English).
    """
    lang = detect_language(text)
    if lang == "English":
        return ""
    if lang == "Arabic":
        return (
            "BILINGUAL OUTPUT REQUIREMENT — THIS IS MANDATORY:\n"
            "The user's question is written in Arabic.\n"
            "You MUST write every JSON string value in BOTH Arabic AND English, side by side.\n"
            "Format: write the Arabic text first, then immediately follow with the English term or phrase in parentheses.\n"
            "Example: 'النماذج القوية (robust models)' or 'التعلم الآلي (machine learning)'.\n"
            "Keep technical terms, equations, and proper nouns in English inside the parentheses.\n"
            "Every title, objective, topic, activity, and checkpoint MUST follow this Arabic (English) pattern.\n"
            "Do NOT produce Arabic-only or English-only strings.\n\n"
        )
    return (
        f"ABSOLUTE LANGUAGE REQUIREMENT — THIS IS MANDATORY:\n"
        f"The user's question is written in {lang}.\n"
        f"You MUST write ALL output ENTIRELY in {lang}.\n"
        f"Every single JSON string value MUST be in {lang} only.\n"
        f"Do NOT mix English words into {lang} sentences.\n"
        f"Do NOT write any word in English inside the JSON values.\n"
        f"Scientific terms that have a well-known {lang} equivalent MUST use that equivalent.\n"
        f"If a term has no {lang} translation, write it in {lang} script with a brief {lang} explanation.\n\n"
    )


def _repair_json(text: str) -> str:
    """
    Attempt basic repairs on almost-valid JSON:
    - Replace single quotes with double quotes
    - Remove trailing commas before ] or }
    - Handle unescaped newlines inside strings
    """
    # Replace single-quoted keys/values with double quotes (simple heuristic)
    repaired = re.sub(r"(?<![\\])\'", '"', text)
    # Remove trailing commas
    repaired = re.sub(r',\s*([}\]])', r'\1', repaired)
    # Fix unescaped newlines inside strings (replace literal newline with \n)
    repaired = re.sub(r'(?<=")([^"]*)\n([^"]*?)(?=")', r'\1\\n\2', repaired)
    return repaired


def _close_truncated_json(text: str) -> str:
    """
    Close a truncated JSON string by appending the missing brackets/braces.
    Walks the text tracking open delimiters and appends the closes in reverse
    order.  Also strips a trailing partial key or unclosed string value so the
    result is parseable.
    """
    # Remove any trailing partial token: an unclosed string or a dangling comma
    # after the last fully-closed value.
    # Truncate at the last complete value boundary (before any trailing comma /
    # partial key / open string).
    truncated = text.rstrip()

    # Drop a trailing comma or partial string fragment
    truncated = re.sub(r',\s*"[^"]*$', '', truncated)   # trailing ,"partial
    truncated = re.sub(r',\s*$', '', truncated)           # trailing ,
    truncated = re.sub(r'"[^"]*$', '', truncated)         # unclosed string

    # Walk the cleaned text to find unclosed delimiters
    stack: list[str] = []
    in_string = False
    escape_next = False
    for ch in truncated:
        if escape_next:
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in ('{', '['):
            stack.append(ch)
        elif ch == '}':
            if stack and stack[-1] == '{':
                stack.pop()
        elif ch == ']':
            if stack and stack[-1] == '[':
                stack.pop()

    # Close remaining open delimiters in reverse order
    closing = ''.join(']' if c == '[' else '}' for c in reversed(stack))
    return truncated + closing


def _strip_thinking(text: str) -> str:
    """
    Remove chain-of-thought / reasoning blocks that some models (GLM, DeepSeek, o1)
    emit before the actual answer.  Handles:
      - <think>...</think>  (explicit thinking tags)
      - <thinking>...</thinking>
      - Any prose preamble that appears before the first JSON bracket — common in
        instruction-tuned models that narrate their own thought process before
        outputting JSON (numbered lists, plain paragraphs, "The user wants..." etc.)
    """
    # Strip explicit thinking tags (greedy, handles multi-line)
    text = re.sub(r"<think(?:ing)?>[\s\S]*?</think(?:ing)?>", "", text, flags=re.IGNORECASE)

    # Strip any preamble text that precedes the first top-level { or [.
    # This handles both numbered reasoning blocks AND plain prose preambles.
    first_brace = min(
        (text.find(c) for c in ('{', '[') if text.find(c) != -1),
        default=-1,
    )
    if first_brace > 0:
        text = text[first_brace:]

    return text


def _find_json_slice(text: str) -> str | None:
    r"""
    Return the substring of *text* that starts at the first top-level
    '{' or '[' and ends at its matching closing bracket.
    This is more reliable than a greedy [\s\S]* regex on malformed JSON.
    """
    for start_ch, end_ch in [('{', '}'), ('[', ']')]:
        idx = text.find(start_ch)
        if idx == -1:
            continue
        depth = 0
        in_string = False
        escape_next = False
        for i, ch in enumerate(text[idx:], start=idx):
            if escape_next:
                escape_next = False
                continue
            if ch == '\\' and in_string:
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == start_ch:
                depth += 1
            elif ch == end_ch:
                depth -= 1
                if depth == 0:
                    return text[idx:i + 1]
        # fell off the end — return everything from the opening bracket
        # (let the JSON parser / repair handle the truncation)
        return text[idx:]
    return None


def extract_json(task_result, label: str = "") -> dict | list:
    """
    Robustly extract a JSON object or array from a CrewAI task output.

    Handles:
      - Plain JSON strings
      - ```json ... ``` fenced blocks
      - ``` ... ``` fenced blocks (no language tag)
      - JSON embedded anywhere in surrounding prose (even after a large preamble)
      - <think>...</think> reasoning blocks emitted by GLM / DeepSeek models
      - Basic JSON repair (trailing commas, single quotes)
    """
    raw = task_result.raw if hasattr(task_result, "raw") else str(task_result)
    if not raw or not raw.strip():
        logger.warning("extract_json(%s): empty task output", label)
        return {}

    # 1. Strip thinking/reasoning blocks first
    stripped = _strip_thinking(raw).strip()

    candidates = []

    # 2. Strip markdown code fences  (```json ... ``` or ``` ... ```)
    for text in (stripped, raw):
        fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
        if fenced:
            candidates.append(fenced.group(1).strip())

    # 3. Bracket-balanced slice — works on large preambles that defeat [\s\S]*
    for text in (stripped, raw):
        sliced = _find_json_slice(text)
        if sliced:
            candidates.append(sliced)

    # 4. Full stripped / raw fallback
    candidates.extend([stripped, raw.strip()])

    seen: set[int] = set()
    for candidate in candidates:
        if not candidate or id(candidate) in seen:
            continue
        seen.add(id(candidate))
        # Try direct parse
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
        # Try after basic repair
        try:
            return json.loads(_repair_json(candidate))
        except json.JSONDecodeError:
            pass
        # Try closing truncated brackets (handles LLM token-limit cut-off)
        try:
            return json.loads(_close_truncated_json(candidate))
        except json.JSONDecodeError:
            pass
        # Try repair + close combined
        try:
            return json.loads(_close_truncated_json(_repair_json(candidate)))
        except json.JSONDecodeError:
            pass

    logger.warning("extract_json(%s): could not parse JSON from output: %r", label, raw[:400])
    return {}


# ── Shared crew helpers ────────────────────────────────────────────────────────
# These live here so every crew imports from one place and is always in sync.

def safe_dict(value: object, unwrap_key: str | None = None) -> dict:
    """
    Coerce *value* to a dict; never raises, never returns None.

    - Unwraps a single-element list: [{"a": 1}] → {"a": 1}
    - If *unwrap_key* is given and the dict contains that key mapped to a dict,
      unwraps it: {"study_plan": {...}} → {...}
      Works even when extra keys are present alongside *unwrap_key*.
    """
    if isinstance(value, list):
        # unwrap single-element list
        if len(value) == 1 and isinstance(value[0], dict):
            value = value[0]
        else:
            return {}
    if isinstance(value, dict):
        if unwrap_key and unwrap_key in value and isinstance(value[unwrap_key], dict):
            return value[unwrap_key]
        return value
    return {}


def safe_list(value: object, key: str) -> list:
    """
    Extract a list from *value* by *key* if it's a dict, or return *value*
    directly if it's already a list.  Never raises.
    """
    if isinstance(value, dict):
        result = value.get(key, [])
        return result if isinstance(result, list) else []
    if isinstance(value, list):
        return value
    return []
