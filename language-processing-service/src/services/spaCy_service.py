import spacy
import asyncio
import re

from src.errors.base_error_code import BaseErrorCode


SPACY_MODEL_NAME = "en_core_web_sm"

# global model instance
_spacy_model = None


# LAZY LOAD MODEL
def _ensure_spacy_model_loaded():
    global _spacy_model

    if _spacy_model is None:
        print(f"[spaCy] Loading model ' {SPACY_MODEL_NAME}'...")
        _spacy_model = spacy.load(SPACY_MODEL_NAME)
        print("✅ [spaCy] Model loaded successfully!")


# 🔥 NORMALIZE WORD (handle -, ', space)
def _normalize_text(text: str) -> str:
    if not text:
        return ""

    text = text.lower().strip()

    # remove hyphen, apostrophe, space
    text = re.sub(r"[-'\s]", "", text)

    return text


def _word_analysis_sync(word: str, context: str | None = None) -> dict:
    if not word or not word.strip():
        raise BaseException(BaseErrorCode.INVALID_REQUEST, "Word must be a non-empty string.")

    _ensure_spacy_model_loaded()

    word = word.strip()
    text = context if context else word

    try:
        doc = _spacy_model(text)

        normalized_target = _normalize_text(word)

        # 🔥 tìm span thay vì token
        for i in range(len(doc)):
            for j in range(i + 1, min(i + 6, len(doc) + 1)):  # max 5 tokens
                span = doc[i:j]
                span_text = _normalize_text(span.text)

                if span_text == normalized_target:
                    token = span[0]  # lấy token đầu làm đại diện

                    return {
                        "text": word,
                        "lemma": token.lemma_,
                        "pos": token.pos_,
                        "tag": token.tag_,
                        "dep": token.dep_,
                        "ent_type": token.ent_type_,
                    }

        # 🔥 fallback: analyze riêng word
        doc_single = _spacy_model(word)

        if len(doc_single) > 0:
            token = doc_single[0]
            return {
                "text": word,
                "lemma": token.lemma_,
                "pos": token.pos_,
                "tag": token.tag_,
                "dep": token.dep_,
                "ent_type": token.ent_type_,
            }

        # fallback cuối cùng
        return {
            "text": word,
            "lemma": word,
            "pos": "UNKNOWN",
            "tag": "",
            "dep": "",
            "ent_type": "",
        }

    except Exception as e:
        raise BaseException(BaseErrorCode.INTERNAL_ERROR, f"spaCy analysis failed: {str(e)}")


# ASYNC WRAPPER
async def analyze_word(word: str, context: str | None = None) -> dict:
    return await asyncio.to_thread(_word_analysis_sync, word, context)


# PRELOAD MODEL AT STARTUP
def preload_spacy_model():
    try:
        _ensure_spacy_model_loaded()
    except Exception as e:
        print(f"Failed to preload spaCy model: {e}")


# UNLOAD MODEL
def unload_spacy_model():
    global _spacy_model
    _spacy_model = None