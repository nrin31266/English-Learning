# src/services/spaCy_service.py
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
        print(f"[spaCy] Loading model '{SPACY_MODEL_NAME}'...")
        _spacy_model = spacy.load(SPACY_MODEL_NAME)
        print("✅ [spaCy] Model loaded successfully!")


def _word_analysis_sync(word: str, context: str | None = None) -> dict:
    if not word or not word.strip():
        raise BaseException(BaseErrorCode.INVALID_REQUEST, "Word must be a non-empty string.")

    _ensure_spacy_model_loaded()

    word = word.strip()
    text = context if context else word

    try:
        doc = _spacy_model(text)
        
        # Tìm token match với word (đã được clean từ bên ngoài)
        for token in doc:
            # Bỏ qua token space
            if token.is_space:
                continue
            
            # So sánh trực tiếp (word đã được clean từ bên ngoài rồi)
            if token.text.lower() == word.lower():
                return {
                    "text": word,
                    "lemma": token.lemma_,
                    "pos": token.pos_,
                    "tag": token.tag_,
                    "dep": token.dep_,
                    "ent_type": token.ent_type_,
                }
        
        # Fallback: analyze riêng word
        doc_single = _spacy_model(word)
        tokens = [t for t in doc_single if not t.is_space]
        
        if tokens:
            token = tokens[0]
            return {
                "text": word,
                "lemma": token.lemma_,
                "pos": token.pos_ if token.pos_ != "SPACE" else "PUNCT",
                "tag": token.tag_ if token.tag_ != "SPACE" else "PUNCT",
                "dep": token.dep_,
                "ent_type": token.ent_type_,
            }

        # Fallback cuối cùng
        return {
            "text": word,
            "lemma": word,
            "pos": "NOUN",
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