# src/utils/text_utils.py
import re
def clean_for_spacy(word: str) -> str:
    """
    Làm sạch dấu câu để phân tích spaCy, nhưng KHÔNG thay đổi database
    Ví dụ: "he." -> "he", "why?" -> "why", "Hello!" -> "Hello"
    """
    if not word:
        return word
    
    # Bỏ dấu câu ở đầu và cuối
    word = re.sub(r'^[^\w\s\'-]+', '', word)
    word = re.sub(r'[^\w\s\'-]+$', '', word)
    return word

def normalize_word_lower(word: str) -> str:
    if word is None:
        return None
    return word.lower().strip()

def normalize_word_soft(word: str) -> str:
    if word is None:
        return None
    word = word.strip()
    word = re.sub(r"^[^a-zA-Z'-]+", "", word)
    word = re.sub(r"[^a-zA-Z'-]+$", "", word)
    return word

def create_slug(word: str) -> str:
    if word is None:
        return None
    slug = word.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug if slug else None