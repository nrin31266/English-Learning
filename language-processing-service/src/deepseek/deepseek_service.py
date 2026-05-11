import asyncio
import json
from typing import Any

import httpx

from src.deepseek.config import config


async def deepseek_generate(prompt: str) -> Any:
    payload = {
        "model": config.model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant for text processing tasks. "
                    "Always respond in JSON format according to the user's request."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
        "stream": False,
        "response_format": {
            "type": "json_object",
        },
    }

    headers = {
        "Authorization": f"Bearer {config.api_key}",
        "Content-Type": "application/json",
    }

    timeout = httpx.Timeout(config.timeout_seconds)
    last_error: Exception | None = None
    for attempt in range(config.max_retries + 1):
        try:
            async with httpx.AsyncClient(
                base_url=config.base_url,
                timeout=timeout,
            ) as client:
                response = await client.post(
                    "/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()
            break
        except httpx.ReadTimeout as exc:
            last_error = exc
            if attempt >= config.max_retries:
                raise
            await asyncio.sleep(1.5 * (attempt + 1))
        except httpx.HTTPError:
            raise
    else:
        if last_error:
            raise last_error
        raise RuntimeError("DeepSeek request failed without a specific error")

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not content:
        raise ValueError("DeepSeek response content is empty")

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        snippet = content[:500]
        raise ValueError(f"DeepSeek response is not valid JSON: {snippet}") from exc
