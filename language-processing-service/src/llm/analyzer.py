import json
import logging

from src.llm.llm_service import generate_json
from src.llm.prompts import (
    SENTENCE_PROMPT_TEMPLATE,
    WORD_ANALYSIS_PROMPT_TEMPLATE,
    build_batch_word_prompt,
)

logger = logging.getLogger(__name__)


async def analyze_sentence_batch(sentences_chunk: list[str]) -> list[dict]:
    """
    Analyze sentence phonetic + Vietnamese translation.
    Keeps the same order as input.
    """
    if not sentences_chunk:
        return []

    prompt = SENTENCE_PROMPT_TEMPLATE.substitute(
        sentences_json=json.dumps(sentences_chunk, ensure_ascii=False)
    )

    resp = await generate_json(prompt)

    if not isinstance(resp, list):
        raise ValueError("Sentence analysis response must be a JSON array")

    if len(resp) != len(sentences_chunk):
        raise ValueError(
            f"Sentence count mismatch: expected {len(sentences_chunk)}, got {len(resp)}"
        )

    for item in resp:
        if isinstance(item, dict) and item.get("phoneticUs"):
            item["phoneticUs"] = str(item["phoneticUs"]).strip().strip("/").strip("[]")

    return resp


async def analyze_word(word: str, pos: str, context: str = "") -> dict:
    """
    Analyze one word/phrase by word + POS.
    Prompt controls schema quality. This function only applies safe defaults.
    """
    prompt = WORD_ANALYSIS_PROMPT_TEMPLATE.substitute(
        word=word,
        pos=pos,
        context=context,
    )

    resp = await generate_json(prompt)

    if not isinstance(resp, dict):
        resp = {}

    resp.setdefault("isValid", False)
    resp.setdefault("summaryVi", "")
    resp.setdefault("phonetics", {})
    resp.setdefault("definitions", [])
    resp.setdefault("cefrLevel", "B1")
    resp.setdefault("isPhrase", False)
    resp.setdefault("phraseType", "")

    if resp["cefrLevel"] not in {"A1", "A2", "B1", "B2", "C1", "C2"}:
        resp["cefrLevel"] = "B1"

    if not isinstance(resp["phonetics"], dict):
        resp["phonetics"] = {}

    if not isinstance(resp["definitions"], list):
        resp["definitions"] = []

    if not isinstance(resp["isValid"], bool):
        resp["isValid"] = bool(resp["isValid"])

    logger.info(
        "[ANALYZE] %s_%s | valid=%s cefr=%s defs=%s phrase=%s",
        word,
        pos,
        resp["isValid"],
        resp["cefrLevel"],
        len(resp["definitions"]),
        resp["isPhrase"],
    )

    return resp


async def analyze_words_batch(words: list[dict]) -> list[dict]:
    """
    Batch analyze multiple words in one AI call.
    Keeps the same order as input.
    """
    if not words:
        return []

    prompt = build_batch_word_prompt(words)
    resp = await generate_json(prompt)

    if not isinstance(resp, list):
        raise ValueError(f"Batch analyze expected list, got {type(resp)}")

    if len(resp) != len(words):
        raise ValueError(
            f"Batch size mismatch: sent {len(words)}, got {len(resp)}"
        )

    results = []

    for item, word_input in zip(resp, words):
        if not isinstance(item, dict):
            item = {}

        item.setdefault("isValid", False)
        item.setdefault("summaryVi", "")
        item.setdefault("phonetics", {})
        item.setdefault("definitions", [])
        item.setdefault("cefrLevel", "B1")
        item.setdefault("isPhrase", False)
        item.setdefault("phraseType", "")

        if item["cefrLevel"] not in {"A1", "A2", "B1", "B2", "C1", "C2"}:
            item["cefrLevel"] = "B1"

        if not isinstance(item["phonetics"], dict):
            item["phonetics"] = {}

        if not isinstance(item["definitions"], list):
            item["definitions"] = []

        if not isinstance(item["isValid"], bool):
            item["isValid"] = bool(item["isValid"])

        logger.info(
            "[BATCH] %s_%s | valid=%s cefr=%s defs=%s phrase=%s",
            word_input.get("word", ""),
            word_input.get("pos", ""),
            item["isValid"],
            item["cefrLevel"],
            len(item["definitions"]),
            item["isPhrase"],
        )

        results.append(item)

    return results