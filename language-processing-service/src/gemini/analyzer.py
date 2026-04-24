
import json
from typing import Any, List, Dict

import logging

logger = logging.getLogger(__name__)


from src.gemini.gemini_service import gemini_generate
from src.gemini.prompts import SENTENCE_PROMPT_TEMPLATE, WORD_ANALYSIS_PROMPT_TEMPLATE


async def analyze_sentence_batch(sentences_chunk: List[Dict[str, Any]]):
    prompt = SENTENCE_PROMPT_TEMPLATE.substitute(
        sentences_json=json.dumps(sentences_chunk, ensure_ascii=False)
    )

    resp = await gemini_generate(prompt)

    # 🔥 HARD VALIDATION (fail fast)
    if not isinstance(resp, list):
        raise ValueError("Response must be JSON array")

    if len(resp) != len(sentences_chunk):
        raise ValueError("Sentence count mismatch")

    for inp, out in zip(sentences_chunk, resp):
        if not isinstance(out, dict):
            raise ValueError("Invalid item type")

        if inp["orderIndex"] != out.get("orderIndex"):
            raise ValueError(f"orderIndex mismatch: expected {inp['orderIndex']}, got {out.get('orderIndex')}")

        if "words" not in out or not isinstance(out["words"], list):
            raise ValueError("Missing words array")

        # 👉 THÊM: validate word count
        if len(inp.get("words", [])) != len(out["words"]):
            raise ValueError(f"Word count mismatch for sentence {inp['orderIndex']}")

    return resp


async def analyze_word(word: str, pos: str, context: str) -> dict:
    prompt = WORD_ANALYSIS_PROMPT_TEMPLATE.substitute(
        word=word,
        pos=pos,
        context=context
    )

    resp = await gemini_generate(prompt)

    # --- validate ---
    required_fields = ["isValid", "summaryVi", "phonetics", "definitions", "cefrLevel"]
    for field in required_fields:
        if field not in resp:
            raise ValueError(f"Missing field: {field}")

    if not isinstance(resp["isValid"], bool):
        raise ValueError("isValid must be boolean")

    if not isinstance(resp["definitions"], list):
        raise ValueError("definitions must be a list")

    if not isinstance(resp["phonetics"], dict):
        raise ValueError("phonetics must be an object")

    # 🔥 validate CEFR
    valid_cefr = {"A1", "A2", "B1", "B2", "C1", "C2"}
    if resp["cefrLevel"] not in valid_cefr:
        raise ValueError(f"Invalid CEFR level: {resp['cefrLevel']}")

    logger.info(
        f"[ANALYZE] {word}_{pos} | "
        f"isValid: {resp['isValid']} | "
        f"cefr: {resp['cefrLevel']} | "
        f"definitions: {len(resp['definitions'])}"
    )

    return resp