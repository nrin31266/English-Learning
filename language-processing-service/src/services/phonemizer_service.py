# src/services/phonemizer_service.py

"""
Phonemizer Service - GPU-powered G2P using OpenPhonemizer
- Pure phonemization with robust IPA normalization
- GPU acceleration
- Clean phoneme segmentation (NOT char split)
"""

import re
import unicodedata
import logging
from typing import List, Optional, Union

logger = logging.getLogger(__name__)

_phonemizer = None
_loaded = False

IPA_NORMALIZATION_RULES = [
    (r'[ɹɻ]', 'r'),           # turned r, retroflex r → r 
    (r'ɾ', 't'),              # flap t → t
    (r'ɐ', 'ə'),              # near-open central → schwa
    (r'ᵻ', 'ɪ'),              # near-close central unrounded → ɪ
    (r'[ɫ]', 'l'),            # dark l → l
    (r'ɚ', 'ər'),             # rhotic schwa → ər
    (r'ɜː', 'ɜr'),            # open-mid central (stressed) → ɜr
    (r'ʲ', ''),               # palatalization → remove
    (r'ʷ', ''),               # labialization → remove
    (r'ʰ', ''),               # aspiration → remove
    (r'ⁿ', 'n'),              # nasal release → n
    (r'ˡ', 'l'),              # lateral release → l
]

LENGTH_MARKERS = r'[ːˑ]'
STRESS_MARKERS = r'[ˈˌ]'
PUNCTUATION_PATTERN = r'[.!?,;:"()\[\]{}\-]'

# =========================
# LOAD MODEL
# =========================
def _patch_torch_load():
    try:
        import torch
        original_load = torch.load

        def patched_load(*args, **kwargs):
            kwargs['weights_only'] = False
            return original_load(*args, **kwargs)

        torch.load = patched_load
    except ImportError:
        pass


def _ensure_loaded(disable_gpu: bool = False):
    global _phonemizer, _loaded

    if _loaded:
        return

    print("[Phonemizer] Loading OpenPhonemizer model...")

    try:
        _patch_torch_load()
        import torch
        from openphonemizer import OpenPhonemizer

        _phonemizer = OpenPhonemizer(disable_gpu=disable_gpu)
        _loaded = True

        if not disable_gpu and torch.cuda.is_available():
            print(f"✅ Ready (GPU: {torch.cuda.get_device_name(0)})")
        else:
            print("✅ Ready (CPU mode)")

    except Exception as e:
        logger.error(f"Failed to load OpenPhonemizer: {e}")
        _phonemizer = None
        _loaded = True


def _normalize_ipa(
    ipa: str,
    keep_stress: bool = True,
    remove_length: bool = True,
    remove_punctuation: bool = False
) -> str:

    if not ipa:
        return ipa

    ipa = unicodedata.normalize("NFKC", ipa)

    if not keep_stress:
        ipa = re.sub(STRESS_MARKERS, '', ipa)

    for pattern, replacement in IPA_NORMALIZATION_RULES:
        ipa = re.sub(pattern, replacement, ipa)

    if remove_length:
        ipa = re.sub(LENGTH_MARKERS, '', ipa)

    if remove_punctuation:
        ipa = re.sub(PUNCTUATION_PATTERN, '', ipa)
    else:
        # GIỮ PUNCTUATION NHƯNG XÓA KHOẢNG TRẮNG THỪA TRƯỚC NÓ
        ipa = re.sub(r'\s+([.,!?;:])', r'\1', ipa)

    # Dọn dẹp khoảng trắng
    ipa = re.sub(r'\s+', ' ', ipa).strip()
    return ipa

# =========================
# PHONEME TOKENIZER (FIXED)
# =========================
def _tokenize_phonemes(ipa: str) -> List[str]:
    """
    Proper phoneme segmentation.
    Splits string into phonemes, stress marks, and punctuation properly.
    """
    if not ipa:
        return []

    tokens = []
    i = 0

    # Danh sách các âm ghép (multi-character phonemes)
    MULTI = ["tʃ", "dʒ", "aɪ", "aʊ", "oʊ", "eɪ", "ɔɪ", "ər", "ɑː", "ɜː", "ɪə", "ʊə", "eə"]

    while i < len(ipa):
        # Bỏ qua khoảng trắng
        if ipa[i].isspace():
            i += 1
            continue

        # Ưu tiên check âm ghép
        matched = False
        for m in MULTI:
            if ipa.startswith(m, i):
                tokens.append(m)
                i += len(m)
                matched = True
                break
        if matched:
            continue

        # Check dấu nhấn
        if ipa[i] in "ˈˌ":
            tokens.append(ipa[i])
            i += 1
            continue

        # Check dấu câu
        if ipa[i] in ".,!?;:\"()[]{}…—–-'":
            tokens.append(ipa[i])
            i += 1
            continue

        # Default: Ký tự đơn (âm đơn)
        tokens.append(ipa[i])
        i += 1

    return tokens


# =========================
# CORE FUNCTION
# =========================
def get_phonemes(
    text: str,
    keep_stress: bool = True,
    normalize: bool = True,
    remove_length: bool = False,
    disable_gpu: bool = False
) -> Optional[List[str]]:

    _ensure_loaded(disable_gpu=disable_gpu)

    if not _phonemizer:
        return None

    if not text or not text.strip():
        return []

    try:
        result = _phonemizer(text.strip(), stress=keep_stress)
        result = result.strip()

        if normalize:
            result = _normalize_ipa(
                result,
                keep_stress=keep_stress,
                remove_length=remove_length
            )

        return _tokenize_phonemes(result)

    except Exception as e:
        logger.error(f"Phonemization failed: {e}")
        return None


# =========================
# IPA STRING
# =========================
def get_ipa(
    text: str,
    keep_stress: bool = True,
    normalize: bool = True,
    remove_length: bool = False,
    as_string: bool = True,
    disable_gpu: bool = False,
    remove_punctuation: bool = True,
) -> Optional[Union[str, List[str]]]:

    _ensure_loaded(disable_gpu=disable_gpu)

    if not _phonemizer:
        return None

    if not text or not text.strip():
        return "" if as_string else []

    try:
        result = _phonemizer(text.strip(), stress=keep_stress)
        result = result.strip()

        if normalize:
            result = _normalize_ipa(
                result,
                keep_stress=keep_stress,
                remove_length=remove_length,
                remove_punctuation=remove_punctuation
            )

        return result if as_string else _tokenize_phonemes(result)

    except Exception as e:
        logger.error(f"Phonemization failed: {e}")
        return None


# =========================
# HELPERS
# =========================
def get_word_ipa(word: str, **kwargs):
    return get_ipa(word, as_string=True, **kwargs)


def get_sentence_ipa(sentence: str, **kwargs):
    return get_ipa(sentence, as_string=True, **kwargs)


def preload(disable_gpu: bool = False):
    _ensure_loaded(disable_gpu=disable_gpu)


def unload():
    global _phonemizer, _loaded
    _phonemizer = None
    _loaded = False

    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except ImportError:
        pass

    print("[Phonemizer] Unloaded")