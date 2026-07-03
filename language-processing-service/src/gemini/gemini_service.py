# src/gemini/gemini_service.py
import asyncio
import json
import logging

from google import genai
from google.genai import types

from src.gemini.config import config

logger = logging.getLogger(__name__)

# Khởi tạo Gemini client
client = genai.Client(api_key=config.api_key)

# Model dùng cho NLP
MODEL_NAME = config.model

SYSTEM_INSTRUCTION = (
    "You are a helpful assistant for text processing tasks. "
    "Always respond in JSON format according to the user's request."
)

GENERATION_CONFIG = types.GenerateContentConfig(
    temperature=0,
    response_mime_type="application/json",
    system_instruction=SYSTEM_INSTRUCTION,
)

logger.info("Gemini Config Loaded: %s", MODEL_NAME)


def _parse_json_response(text: str):
    if not text:
        return {}

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error("Gemini returned invalid JSON: %s", text[:500])
        raise ValueError("Gemini returned invalid JSON.") from e


def _generate_sync(prompt: str):
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=GENERATION_CONFIG,
    )

    return _parse_json_response(response.text)


async def gemini_generate(prompt: str):
    return await asyncio.to_thread(_generate_sync, prompt)