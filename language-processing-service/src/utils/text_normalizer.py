# src/utils/text_normalizer.py
"""
Text normalization utilities - KHÔNG import service-level modules
"""
import re


def normalize_word_lower(word: str | None) -> str | None:
    """Chuẩn hóa từ: lowercase, bỏ dấu câu cuối, bỏ khoảng trắng"""
    if not word:
        return None
    
    word = word.lower().strip()
    # Bỏ dấu câu cuối câu
    word = re.sub(r'[.,!?;:]+$', '', word)
    # Bỏ dấu câu ở đầu
    word = re.sub(r'^[.,!?;:]+', '', word)
    
    return word if word else None