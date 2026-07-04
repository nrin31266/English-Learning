# src/services/shadowing/phonemizer_service.py

import logging
import re
import unicodedata
from functools import lru_cache
from typing import Optional, Union

logger = logging.getLogger(__name__)

_phonemizer = None
_loaded = False

# ==============================================================================
# IPA NORMALIZATION PATTERNS
# ==============================================================================
STRESS_PATTERN = re.compile(r"[ˈˌ]")
LENGTH_PATTERN = re.compile(r"[ːˑ]")
PUNCTUATION_PATTERN = re.compile(r"[.!?,;:\"()\[\]{}\-…—–']")
WHITESPACE_CLEANUP = re.compile(r"\s+")
WHITESPACE_BEFORE_PUNCT = re.compile(r"\s+([.,!?;:])")

# Conservative IPA normalization.
# Do not over-map vowels/consonants here, because pronunciation scoring still
# needs to detect real pronunciation differences.
IPA_RULES = [
    # r variants
    (re.compile(r"[ɹɻʁ]"), "r"),

    # l variants
    (re.compile(r"ɫ"), "l"),

    # flap / tapped t
    (re.compile(r"ɾ"), "t"),

    # schwa-like variants
    (re.compile(r"ɐ"), "ə"),
    (re.compile(r"ᵻ"), "ɪ"),

    # rhotic vowels
    (re.compile(r"ɚ"), "ər"),
    (re.compile(r"ɝ"), "ɜr"),
    (re.compile(r"ɜː"), "ɜr"),

    # diacritics / secondary articulations
    (re.compile(r"[ʲʷʰ˞]"), ""),

    # syllabic consonant marks
    (re.compile(r"ⁿ"), "n"),
    (re.compile(r"ˡ"), "l"),
    (re.compile(r"ᵐ"), "m"),
]

MULTI_CHARS = [
    "tʃ",
    "dʒ",
    "aɪ",
    "aʊ",
    "oʊ",
    "eɪ",
    "ɔɪ",
    "ər",
    "ɜr",
    "ɑː",
    "ɔː",
    "ɪə",
    "ʊə",
    "eə",
]

MULTI_CHARS = sorted(MULTI_CHARS, key=len, reverse=True)

TOKENIZER_REGEX = re.compile(
    "|".join(re.escape(item) for item in MULTI_CHARS)
    + r"|[ˈˌ]"
    + r"|[.,!?;:\"()\[\]{}…—–\-']"
    + r"|."
)


# ==============================================================================
# LOAD / UNLOAD
# ==============================================================================
def _patch_torch_load() -> None:
    try:
        import torch

        original_load = torch.load

        if getattr(original_load, "_phonemizer_patched", False):
            return

        def patched_load(*args, **kwargs):
            kwargs["weights_only"] = False
            return original_load(*args, **kwargs)

        patched_load._phonemizer_patched = True
        torch.load = patched_load

    except Exception as e:
        logger.debug("[Phonemizer] torch.load patch skipped | err=%s", e)


def _ensure_loaded(disable_gpu: bool = False) -> None:
    global _phonemizer, _loaded

    if _loaded:
        return

    logger.info("[Phonemizer] Loading OpenPhonemizer model...")

    try:
        _patch_torch_load()

        import torch
        from openphonemizer import OpenPhonemizer

        _phonemizer = OpenPhonemizer(disable_gpu=disable_gpu)
        _loaded = True

        device = (
            torch.cuda.get_device_name(0)
            if not disable_gpu and torch.cuda.is_available()
            else "CPU"
        )

        logger.info("[Phonemizer] Model loaded | device=%s", device)

    except Exception as e:
        _phonemizer = None
        _loaded = True
        logger.exception("[Phonemizer] Failed to load model | err=%s", e)


def preload(disable_gpu: bool = False) -> None:
    _ensure_loaded(disable_gpu=disable_gpu)


def unload() -> None:
    global _phonemizer, _loaded

    _phonemizer = None
    _loaded = False
    _get_raw_ipa_cached.cache_clear()
    _get_ipa_cached.cache_clear()

    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    except Exception as e:
        logger.debug("[Phonemizer] CUDA cleanup skipped | err=%s", e)

    logger.info("[Phonemizer] Model unloaded")


# ==============================================================================
# NORMALIZATION / TOKENIZATION
# ==============================================================================
def _normalize_ipa(
    ipa: str,
    keep_stress: bool = True,
    remove_length: bool = True,
    remove_punctuation: bool = False,
) -> str:
    if not ipa:
        return ""

    ipa = unicodedata.normalize("NFKC", ipa)

    if not keep_stress:
        ipa = STRESS_PATTERN.sub("", ipa)

    for pattern, replacement in IPA_RULES:
        ipa = pattern.sub(replacement, ipa)

    if remove_length:
        ipa = LENGTH_PATTERN.sub("", ipa)

    if remove_punctuation:
        ipa = PUNCTUATION_PATTERN.sub("", ipa)
    else:
        ipa = WHITESPACE_BEFORE_PUNCT.sub(r"\1", ipa)

    return WHITESPACE_CLEANUP.sub(" ", ipa).strip()


def _tokenize_phonemes(ipa: str) -> list[str]:
    if not ipa:
        return []

    return [
        token
        for token in TOKENIZER_REGEX.findall(ipa)
        if token and not token.isspace()
    ]


# ==============================================================================
# CORE API
# ==============================================================================
@lru_cache(maxsize=20000)
def _get_raw_ipa_cached(
    text: str,
    keep_stress: bool,
    disable_gpu: bool,
) -> str:
    _ensure_loaded(disable_gpu=disable_gpu)

    if not _phonemizer or not text.strip():
        return ""

    try:
        return _phonemizer(text.strip(), stress=keep_stress).strip()

    except Exception as e:
        logger.warning(
            "[Phonemizer] Phonemization failed | text=%s | err=%s",
            text[:80],
            e,
        )
        return ""


@lru_cache(maxsize=20000)
def _get_ipa_cached(
    text: str,
    keep_stress: bool,
    normalize: bool,
    remove_length: bool,
    remove_punctuation: bool,
    disable_gpu: bool,
) -> str:
    raw_ipa = _get_raw_ipa_cached(
        text.strip(),
        keep_stress,
        disable_gpu,
    )

    if not raw_ipa:
        return ""

    if not normalize:
        return raw_ipa

    return _normalize_ipa(
        raw_ipa,
        keep_stress=keep_stress,
        remove_length=remove_length,
        remove_punctuation=remove_punctuation,
    )


def get_ipa(
    text: str,
    keep_stress: bool = True,
    normalize: bool = True,
    remove_length: bool = False,
    as_string: bool = True,
    disable_gpu: bool = False,
    remove_punctuation: bool = True,
) -> Union[str, list[str]]:
    if not text or not text.strip():
        return "" if as_string else []

    ipa = _get_ipa_cached(
        text.strip(),
        keep_stress,
        normalize,
        remove_length,
        remove_punctuation,
        disable_gpu,
    )

    return ipa if as_string else _tokenize_phonemes(ipa)


def get_phonemes(text: str, **kwargs) -> list[str]:
    kwargs["as_string"] = False
    result = get_ipa(text, **kwargs)

    return result if isinstance(result, list) else []