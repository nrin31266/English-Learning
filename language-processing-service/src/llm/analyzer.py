import json
from typing import Dict, List

import logging

from src.llm.llm_service import generate_json
from src.llm.prompts import SENTENCE_PROMPT_TEMPLATE, WORD_ANALYSIS_PROMPT_TEMPLATE, build_batch_word_prompt

logger = logging.getLogger(__name__)

VALID_CEFR = {"A1", "A2", "B1", "B2", "C1", "C2"}


async def analyze_sentence_batch(sentences_chunk: List[str]) -> List[Dict[str, str]]:
    """
    sentences_chunk: list of sentence texts only (no orderIndex, no words)
    Returns: list of dicts with phoneticUs and translationVi only
    """
    prompt = SENTENCE_PROMPT_TEMPLATE.substitute(
        sentences_json=json.dumps(sentences_chunk, ensure_ascii=False)
    )

    resp = await generate_json(prompt)

    if not isinstance(resp, list):
        raise ValueError("Response must be JSON array")

    if len(resp) != len(sentences_chunk):
        raise ValueError(
            f"Sentence count mismatch: expected {len(sentences_chunk)}, got {len(resp)}"
        )

    for item in resp:
        if "phoneticUs" in item and item["phoneticUs"]:
            item["phoneticUs"] = item["phoneticUs"].strip().strip("/")

    return resp


async def analyze_word(word: str, pos: str, context: str) -> dict:
    prompt = WORD_ANALYSIS_PROMPT_TEMPLATE.substitute(
        word=word,
        pos=pos,
        context=context,
    )

    resp = await generate_json(prompt)

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

    if resp["cefrLevel"] not in VALID_CEFR:
        resp["cefrLevel"] = "B1"

    # Defaults for new fields
    resp.setdefault("isPhrase", False)
    resp.setdefault("phraseType", "")

    logger.info(
        "[ANALYZE] %s_%s | valid=%s cefr=%s defs=%s phrase=%s",
        word, pos, resp["isValid"], resp["cefrLevel"],
        len(resp["definitions"]), resp["isPhrase"],
    )
    return resp


async def analyze_words_batch(words: list[dict]) -> list[dict]:
    """
    Batch analyze multiple words in a single AI call.

    words: [{"word": "...", "pos": "...", "context": "..."}, ...]
    Returns list of result dicts in same order. Invalid/malformed entries get isValid=False.
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

    required = {"isValid", "summaryVi", "phonetics", "definitions", "cefrLevel"}
    results = []
    for i, (item, word_input) in enumerate(zip(resp, words)):
        try:
            if not isinstance(item, dict):
                raise ValueError("Not a dict")
            missing = required - set(item.keys())
            if missing:
                raise ValueError(f"Missing fields: {missing}")
            if item.get("cefrLevel") not in VALID_CEFR:
                item["cefrLevel"] = "B1"
            if not isinstance(item.get("isValid"), bool):
                item["isValid"] = False
            item.setdefault("isPhrase", False)
            item.setdefault("phraseType", "")
            logger.info(
                "[BATCH] %s_%s | valid=%s cefr=%s defs=%s phrase=%s",
                word_input["word"], word_input["pos"],
                item["isValid"], item["cefrLevel"],
                len(item.get("definitions", [])), item["isPhrase"],
            )
            results.append(item)
        except Exception as e:
            logger.warning("[BATCH] Item %d invalid (%s), marking isValid=False", i, e)
            results.append({"isValid": False, "summaryVi": "", "phonetics": {},
                            "definitions": [], "cefrLevel": "B1",
                            "isPhrase": False, "phraseType": ""})

    return results
