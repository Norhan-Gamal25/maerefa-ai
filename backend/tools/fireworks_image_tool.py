"""
Fireworks Image Tool — Layer 2 Islamic Compliance.
ISLAMIC_NEGATIVE_PROMPT is always appended. Non-configurable by agents.
"""
import os
import requests
from pydantic import BaseModel, Field
from backend.config.islamic_policy import ISLAMIC_NEGATIVE_PROMPT

try:
    from crewai.tools import BaseTool as _Base  # type: ignore
except ImportError:  # crewai not installed (e.g. in unit test environment)
    _Base = BaseModel  # type: ignore


class FireworksImageTool(_Base):
    name: str = "fireworks_image_generator"
    description: str = (
        "Generates an aniconic STEM illustration via Fireworks AI Stable Diffusion XL. "
        "Always safe — Islamic negative prompt is hardcoded and cannot be overridden."
    )
    api_key: str = Field(default_factory=lambda: os.environ.get("FIREWORKS_API_KEY", ""))

    def _run(self, prompt: str) -> str:
        """Generate image and return URL. Returns empty string on failure."""
        if not self.api_key:
            return ""
        try:
            response = requests.post(
                "https://api.fireworks.ai/inference/v1/image_generation/accounts/"
                "fireworks/models/stable-diffusion-xl-1024-v1-0",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "prompt": prompt,
                    "negative_prompt": ISLAMIC_NEGATIVE_PROMPT,  # Fix 2 — hardcoded, never agent-configurable
                    "width": 1024,
                    "height": 1024,
                    "num_inference_steps": 30,
                    "guidance_scale": 7.5,
                    "output_format": "URL",
                },
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            images = data.get("images") or data.get("output", {}).get("choices", [])
            if images:
                img = images[0]
                if isinstance(img, dict):
                    return img.get("url", "")
                return str(img)
            return ""
        except Exception:
            return ""
