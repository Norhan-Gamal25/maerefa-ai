"""
test_image_tool.py — assert ISLAMIC_NEGATIVE_PROMPT always included in API call
"""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from unittest.mock import patch, MagicMock
from backend.tools.fireworks_image_tool import FireworksImageTool
from backend.config.islamic_policy import ISLAMIC_NEGATIVE_PROMPT


def test_negative_prompt_always_included():
    """ISLAMIC_NEGATIVE_PROMPT must appear in every POST body."""
    tool = FireworksImageTool(api_key="test_key")
    captured = {}

    def mock_post(url, headers, json, timeout):
        captured["json"] = json
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {"images": [{"url": "https://example.com/img.png"}]}
        return mock_resp

    with patch("requests.post", side_effect=mock_post):
        result = tool._run("abstract fractal geometry blue")

    assert "json" in captured, "requests.post was never called"
    body = captured["json"]
    assert "negative_prompt" in body, "negative_prompt key missing from request body"
    assert ISLAMIC_NEGATIVE_PROMPT in body["negative_prompt"], (
        "ISLAMIC_NEGATIVE_PROMPT not found in negative_prompt"
    )


def test_negative_prompt_not_overridable():
    """Even if caller provides a different prompt, the hardcoded one is used."""
    tool = FireworksImageTool(api_key="test_key")
    captured = {}

    def mock_post(url, headers, json, timeout):
        captured["json"] = json
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {"images": []}
        return mock_resp

    custom_prompt = "a beautiful sunrise with people and animals"
    with patch("requests.post", side_effect=mock_post):
        tool._run(custom_prompt)

    body = captured.get("json", {})
    # The negative prompt must always be the hardcoded Islamic one
    assert body.get("negative_prompt") == ISLAMIC_NEGATIVE_PROMPT


def test_empty_api_key_returns_empty_string():
    """No API key → return empty string, no HTTP call."""
    tool = FireworksImageTool(api_key="")
    with patch("requests.post") as mock_post:
        result = tool._run("test prompt")
    mock_post.assert_not_called()
    assert result == ""
