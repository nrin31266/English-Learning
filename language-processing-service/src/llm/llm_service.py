import logging
import os
from typing import Any

from src.deepseek.deepseek_service import deepseek_generate
from src.gemini.gemini_service import gemini_generate

logger = logging.getLogger(__name__)


def _provider_name() -> str:
    return os.getenv("AI_PROVIDER", "deepseek").strip().lower()


async def generate_json(prompt: str) -> Any:
    provider = _provider_name()
    logger.info("[LLM] Using provider: %s", provider)
    if provider == "deepseek":
        return await deepseek_generate(prompt)
    if provider == "gemini":
        return await gemini_generate(prompt)

    raise ValueError(
        "Unsupported AI_PROVIDER. Use 'deepseek' or 'gemini'."
    )
