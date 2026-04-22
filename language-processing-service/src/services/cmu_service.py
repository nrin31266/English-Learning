# src/services/cmu_service.py
"""
CMU Service - CHỈ LÀ DATA PROVIDER
- Load CMU dictionary
- Get phonemes for a word
- KHÔNG scoring, KHÔNG fallback, KHÔNG compare
"""
import asyncio
import logging
import re
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

_cmu_dict: Optional[Dict[str, List[List[str]]]] = None
_cmu_dict_loaded = False

CMU_MODEL_NAME = "cmudict"


def _ensure_cmu_dict_loaded():
    global _cmu_dict, _cmu_dict_loaded
    if _cmu_dict_loaded:
        return

    print(f"[CMU] Loading {CMU_MODEL_NAME}...")
    try:
        from nltk.corpus import cmudict
        _cmu_dict = cmudict.dict()
        _cmu_dict_loaded = True
        print("✅ [CMU] Dictionary loaded successfully!")
    except ImportError:
        logger.warning("nltk not installed. CMU phoneme features disabled.")
        _cmu_dict = None
        _cmu_dict_loaded = True
    except Exception as e:
        logger.error(f"Failed to load CMU dict: {e}")
        _cmu_dict = None
        _cmu_dict_loaded = True


def _clean_word_for_cmu(word: str | None) -> str:
    if not word:
        return ""
    return re.sub(r"[^a-z']", "", word.lower()).strip()


def _normalize_phoneme(p: str) -> str:
    """Strip stress markers: AE1 → AE, ER0 → ER"""
    return re.sub(r'[0-9]', '', p)


def get_phonemes(word: str) -> Optional[List[str]]:
    """
    Lấy phoneme list từ CMU dict (ARPABET format, đã strip stress markers).
    Nếu không tìm thấy → None.
    """
    _ensure_cmu_dict_loaded()
    
    if not _cmu_dict:
        return None

    word_clean = _clean_word_for_cmu(word)
    if not word_clean:
        return None

    # Thử tra từ gốc
    variants = _cmu_dict.get(word_clean)
    
    # Thử tra không có apostrophe
    if not variants and "'" in word_clean:
        variants = _cmu_dict.get(word_clean.replace("'", ""))
    
    if not variants:
        return None

    first = variants[0] if variants else None
    if not first:
        return None

    # Normalize ngay từ đầu: strip stress markers
    return [_normalize_phoneme(p) for p in first if p]


def preload_cmu_model():
    try:
        _ensure_cmu_dict_loaded()
    except Exception as e:
        print(f"Failed to preload CMU model: {e}")
def get_phonemes_with_stress(word: str) -> Optional[List[str]]:
    """
    Lấy phoneme list từ CMU dict (GIỮ stress markers).
    Ví dụ: 'Packer' → ['P', 'AE1', 'K', 'ER0']
    """
    _ensure_cmu_dict_loaded()
    
    if not _cmu_dict:
        return None

    word_clean = _clean_word_for_cmu(word)
    if not word_clean:
        return None

    variants = _cmu_dict.get(word_clean)
    if not variants and "'" in word_clean:
        variants = _cmu_dict.get(word_clean.replace("'", ""))
    
    if not variants:
        return None

    first = variants[0] if variants else None
    if not first:
        return None

    # GIỮ stress markers
    return [p for p in first if p]


def unload_cmu_model():
    global _cmu_dict, _cmu_dict_loaded
    _cmu_dict = None
    _cmu_dict_loaded = False
    print("[CMU] Dictionary unloaded.")