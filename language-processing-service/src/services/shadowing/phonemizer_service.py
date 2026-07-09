# src/services/shadowing/phonemizer_service.py

import logging
import re
import unicodedata
from functools import lru_cache
from typing import Union

import inflect

logger = logging.getLogger(__name__)

_phonemizer = None
_loaded = False
_inflect_engine = inflect.engine()

# ==============================================================================
# IPA NORMALIZATION PATTERNS
# ==============================================================================
STRESS_PATTERN = re.compile(r"[ˈˌ]")
LENGTH_PATTERN = re.compile(r"[ːˑ]")
PUNCTUATION_PATTERN = re.compile(r"[.!?,;:\"()\[\]{}\-…—–']")
WHITESPACE_CLEANUP = re.compile(r"\s+")
WHITESPACE_BEFORE_PUNCT = re.compile(r"\s+([.,!?;:])")

# ==============================================================================
# TEXT NORMALIZATION CONSTANTS
# ==============================================================================
DIGIT_WORDS = {
    "0": "zero",
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "five",
    "6": "six",
    "7": "seven",
    "8": "eight",
    "9": "nine",
}

LETTER_NAMES = {
    "A": "ay",
    "B": "bee",
    "C": "see",
    "D": "dee",
    "E": "ee",
    "F": "ef",
    "G": "gee",
    "H": "aitch",
    "I": "eye",
    "J": "jay",
    "K": "kay",
    "L": "el",
    "M": "em",
    "N": "en",
    "O": "oh",
    "P": "pee",
    "Q": "cue",
    "R": "are",
    "S": "ess",
    "T": "tee",
    "U": "you",
    "V": "vee",
    "W": "double you",
    "X": "ex",
    "Y": "why",
    "Z": "zee",
}

MONTHS = {
    "1": "January",
    "01": "January",
    "2": "February",
    "02": "February",
    "3": "March",
    "03": "March",
    "4": "April",
    "04": "April",
    "5": "May",
    "05": "May",
    "6": "June",
    "06": "June",
    "7": "July",
    "07": "July",
    "8": "August",
    "08": "August",
    "9": "September",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
}

MONTH_NAME_PATTERN_PART = (
    r"January|February|March|April|May|June|July|August|"
    r"September|October|November|December"
)

# ==============================================================================
# TEXT NORMALIZATION PATTERNS
# ==============================================================================
ABBREVIATION_RULES = [
    # Titles
    (re.compile(r"\bMr\.", re.IGNORECASE), "mister"),
    (re.compile(r"\bMrs\.", re.IGNORECASE), "missus"),
    (re.compile(r"\bMs\.", re.IGNORECASE), "miss"),
    (re.compile(r"\bDr\.", re.IGNORECASE), "doctor"),
    (re.compile(r"\bProf\.", re.IGNORECASE), "professor"),

    # Address / common written forms
    (re.compile(r"\bSt\.", re.IGNORECASE), "street"),
    (re.compile(r"\bRd\.", re.IGNORECASE), "road"),
    (re.compile(r"\bAve\.", re.IGNORECASE), "avenue"),
    (re.compile(r"\bBlvd\.", re.IGNORECASE), "boulevard"),
    (re.compile(r"\bNo\.", re.IGNORECASE), "number"),

    # Common short forms
    (re.compile(r"\bvs\.", re.IGNORECASE), "versus"),
    (re.compile(r"\betc\.", re.IGNORECASE), "etcetera"),
    (re.compile(r"\bDept\.", re.IGNORECASE), "department"),

    # Letter-name abbreviations
    (re.compile(r"\bD\.C\.", re.IGNORECASE), "dee see"),
    (re.compile(r"\bU\.S\.", re.IGNORECASE), "you ess"),
    (re.compile(r"\bU\.K\.", re.IGNORECASE), "you kay"),
    (re.compile(r"\ba\.m\.", re.IGNORECASE), "ay em"),
    (re.compile(r"\bp\.m\.", re.IGNORECASE), "pee em"),
]

DATE_SLASH_PATTERN = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")
DATE_TEXT_PATTERN = re.compile(
    rf"\b({MONTH_NAME_PATTERN_PART})\s+(\d{{1,2}})(?:st|nd|rd|th)?(?:,\s*|\s+)(\d{{4}})\b",
    re.IGNORECASE,
)

TIME_PATTERN = re.compile(r"\b(\d{1,2}):(\d{2})\b")
MONEY_DOLLAR_PATTERN = re.compile(r"\$(\d+)(?:\.(\d{1,2}))?")
CURRENCY_AMOUNT_PATTERN = re.compile(
    r"\b(\d+)(?:\.(\d{1,2}))?\s*(VND|USD|EUR|GBP)\b",
    re.IGNORECASE,
)
PERCENT_PATTERN = re.compile(r"\b(\d+)%")
VERSION_PATTERN = re.compile(r"\b\d+(?:\.\d+){1,4}\b")

DASH_CODE_PATTERN = re.compile(
    r"\b(?=[A-Za-z0-9-]*[A-Za-z])(?=[A-Za-z0-9-]*\d)"
    r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b"
)

ALNUM_CODE_PATTERN = re.compile(
    r"\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{2,}\b"
)

ACRONYM_PATTERN = re.compile(r"\b[A-Z]{2,}\b")
NUMBER_PATTERN = re.compile(r"\b\d+\b")
OCLOCK_PATTERN = re.compile(r"\bo'clock\b", re.IGNORECASE)

# ==============================================================================
# TEXT NORMALIZATION HELPERS
# ==============================================================================
def _clean_spoken_words(value: str) -> str:
    value = value.replace("-", " ")
    value = value.replace(",", "")
    return WHITESPACE_CLEANUP.sub(" ", value).strip()


def _digits_to_words(value: str) -> str:
    return " ".join(
        DIGIT_WORDS[digit]
        for digit in value
        if digit.isdigit()
    )


def _letters_to_words(value: str) -> str:
    return " ".join(
        LETTER_NAMES.get(char.upper(), char.lower())
        for char in value
        if char.isalpha()
    )


def _number_to_words(value: int) -> str:
    return _clean_spoken_words(
        _inflect_engine.number_to_words(
            value,
            andword="and",
        )
    )


def _ordinal_to_words(value: int) -> str:
    ordinal = _inflect_engine.ordinal(value)
    return _clean_spoken_words(_inflect_engine.number_to_words(ordinal))


def _year_to_words(year: str) -> str:
    if len(year) != 4 or not year.isdigit():
        return _digits_to_words(year)

    value = int(year)

    if 2000 <= value <= 2099:
        last_two = value % 100

        if last_two == 0:
            return "two thousand"

        if last_two < 10:
            return f"two thousand {_number_to_words(last_two)}"

        return f"twenty {_number_to_words(last_two)}"

    if 1900 <= value <= 1999:
        last_two = value % 100

        if last_two == 0:
            return "nineteen hundred"

        return f"nineteen {_number_to_words(last_two)}"

    return _digits_to_words(year)


def _code_to_words(value: str) -> str:
    parts = re.findall(r"[A-Za-z]+|\d+", value)
    words: list[str] = []

    for part in parts:
        if part.isalpha():
            words.extend(
                LETTER_NAMES.get(char.upper(), char.lower())
                for char in part
            )
        else:
            words.extend(
                DIGIT_WORDS[digit]
                for digit in part
                if digit.isdigit()
            )

    return " ".join(words)


def _dash_code_to_words(value: str) -> str:
    parts = value.split("-")
    spoken_parts = [_code_to_words(part) for part in parts if part]

    return " dash ".join(spoken_parts)


def _normalize_date_slash(match: re.Match) -> str:
    day_raw, month_raw, year_raw = match.groups()

    day = int(day_raw)
    month = MONTHS.get(month_raw, month_raw)
    day_word = _ordinal_to_words(day) if 1 <= day <= 31 else _digits_to_words(day_raw)

    return f"{month} {day_word} {_year_to_words(year_raw)}"


def _normalize_date_text(match: re.Match) -> str:
    month_raw, day_raw, year_raw = match.groups()

    day = int(day_raw)
    month = month_raw.capitalize()
    day_word = _ordinal_to_words(day) if 1 <= day <= 31 else _digits_to_words(day_raw)

    return f"{month} {day_word} {_year_to_words(year_raw)}"


def _normalize_time(match: re.Match) -> str:
    hour_raw, minute_raw = match.groups()

    hour = int(hour_raw)
    minute = int(minute_raw)
    suffix = ""

    if hour == 0:
        hour_word = "twelve"
        suffix = "ay em"
    elif hour > 12:
        hour_word = _number_to_words(hour - 12)
        suffix = "pee em"
    else:
        hour_word = _number_to_words(hour)

    if minute == 0:
        minute_word = "o clock"
    elif minute < 10:
        minute_word = f"oh {_number_to_words(minute)}"
    else:
        minute_word = _number_to_words(minute)

    return f"{hour_word} {minute_word} {suffix}".strip()


def _normalize_dollar_money(match: re.Match) -> str:
    dollars_raw, cents_raw = match.groups()
    dollars = _number_to_words(int(dollars_raw))

    if cents_raw is None:
        return f"{dollars} dollars"

    cents_value = int(cents_raw.ljust(2, "0"))
    cents = _number_to_words(cents_value)

    return f"{dollars} dollars and {cents} cents"


def _currency_name(code: str) -> str:
    code_upper = code.upper()

    if code_upper == "USD":
        return "you ess dee"

    if code_upper == "EUR":
        return "euros"

    if code_upper == "GBP":
        return "pounds"

    if code_upper == "VND":
        return "vee en dee"

    return _letters_to_words(code_upper)


def _normalize_currency_amount(match: re.Match) -> str:
    whole_raw, decimal_raw, code_raw = match.groups()

    whole = _number_to_words(int(whole_raw))
    currency = _currency_name(code_raw)

    if decimal_raw:
        decimal = _digits_to_words(decimal_raw)
        return f"{whole} point {decimal} {currency}"

    return f"{whole} {currency}"


def _normalize_percent(match: re.Match) -> str:
    return f"{_number_to_words(int(match.group(1)))} percent"


def _normalize_version(match: re.Match) -> str:
    parts = match.group(0).split(".")
    spoken_parts = [_digits_to_words(part) for part in parts]

    return " point ".join(spoken_parts)


def _normalize_number(match: re.Match) -> str:
    value = match.group(0)

    # Phone numbers, OTP, PIN, HTTP codes, ports, IDs.
    # Digit-by-digit is safer for a pronunciation app.
    if len(value) >= 3:
        return _digits_to_words(value)

    return _number_to_words(int(value))


@lru_cache(maxsize=50000)
def normalize_text_for_phonemizer(text: str) -> str:
    """
    Convert raw lesson text into a speech-friendly form before OpenPhonemizer.

    Examples:
    - Mr. Brown      -> mister Brown
    - D.C.           -> dee see
    - 7:30           -> seven thirty
    - 18:45          -> six forty five pee em
    - 0912345678     -> zero nine one two three four five six seven eight
    - $45.50         -> forty five dollars and fifty cents
    - 15%            -> fifteen percent
    - 21/08/2026     -> August twenty first twenty twenty six
    - B12            -> bee one two
    - A301           -> ay three zero one
    - VN651          -> vee en six five one
    - QR973          -> cue are nine seven three
    - 23IT231        -> two three eye tee two three one
    - INV-2026-007   -> eye en vee dash two zero two six dash zero zero seven
    - 2.0.1          -> two point zero point one
    """
    if not text:
        return ""

    text = unicodedata.normalize("NFKC", text)

    for pattern, replacement in ABBREVIATION_RULES:
        text = pattern.sub(replacement, text)

    text = OCLOCK_PATTERN.sub("o clock", text)
    text = DATE_SLASH_PATTERN.sub(_normalize_date_slash, text)
    text = DATE_TEXT_PATTERN.sub(_normalize_date_text, text)
    text = MONEY_DOLLAR_PATTERN.sub(_normalize_dollar_money, text)
    text = CURRENCY_AMOUNT_PATTERN.sub(_normalize_currency_amount, text)
    text = PERCENT_PATTERN.sub(_normalize_percent, text)
    text = VERSION_PATTERN.sub(_normalize_version, text)
    text = TIME_PATTERN.sub(_normalize_time, text)
    text = DASH_CODE_PATTERN.sub(lambda match: _dash_code_to_words(match.group(0)), text)
    text = ALNUM_CODE_PATTERN.sub(lambda match: _code_to_words(match.group(0)), text)
    text = ACRONYM_PATTERN.sub(lambda match: _letters_to_words(match.group(0)), text)
    text = NUMBER_PATTERN.sub(_normalize_number, text)

    return WHITESPACE_CLEANUP.sub(" ", text).strip()


# ==============================================================================
# IPA RULES / TOKENIZATION
# ==============================================================================
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
    normalize_text_for_phonemizer.cache_clear()

    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    except Exception as e:
        logger.debug("[Phonemizer] CUDA cleanup skipped | err=%s", e)

    logger.info("[Phonemizer] Model unloaded")


# ==============================================================================
# IPA NORMALIZATION / TOKENIZATION
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
    normalize_text: bool,
) -> str:
    prepared_text = (
        normalize_text_for_phonemizer(text)
        if normalize_text
        else text.strip()
    )

    raw_ipa = _get_raw_ipa_cached(
        prepared_text,
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
    normalize_text: bool = True,
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
        normalize_text,
    )

    return ipa if as_string else _tokenize_phonemes(ipa)


def get_phonemes(text: str, **kwargs) -> list[str]:
    kwargs["as_string"] = False
    result = get_ipa(text, **kwargs)

    return result if isinstance(result, list) else []


# ==============================================================================
# DIAGNOSTIC
# ==============================================================================
if __name__ == "__main__":
    import warnings

    warnings.filterwarnings("ignore", category=UserWarning)

    print("\n" + "=" * 80)
    print("OPENPHONEMIZER FINAL DIAGNOSTIC")
    print("=" * 80)
    print("Purpose: Test compact hard cases only.")
    print("Note   : This does not compare pronunciation and does not score shadowing.")
    print("=" * 80)

    tests = [
        # Titles
        "Mr. Brown",
        "Mrs. Taylor",
        "Ms. Linda",
        "Dr. Carter",
        "Prof. Williams",

        # Common abbreviations
        "Washington, D.C.",
        "the U.S.",
        "the U.K.",
        "9:30 a.m.",
        "3:15 p.m.",
        "Dept.",
        "vs.",
        "etc.",

        # Address forms
        "No. 25 Green St.",
        "King Rd.",
        "Sunrise Ave.",
        "River Blvd.",

        # Time
        "7:30",
        "8:05",
        "10:45 p.m.",
        "18:45",
        "00:05",

        # Dates
        "July 9, 2026",
        "December 12th 2026",
        "21/08/2026",

        # Money / percent / currencies
        "$45.50",
        "$180",
        "15%",
        "30000 VND",
        "500000 VND",
        "45 EUR",
        "20 USD",
        "99.90 USD",

        # Codes / IDs
        "B12",
        "A301",
        "C7",
        "D204",
        "23IT231",
        "VN651",
        "QR973",
        "INV-2026-007",
        "AB-2026-009",
        "BKD-2026-015",

        # Numbers
        "25",
        "402",
        "404",
        "8080",
        "5173",
        "1234567890",
        "0000",
        "482913",
        "7001",
        "0912345678",

        # Versions / devices
        "2.0.1",
        "iPhone 15",
        "Samsung S24",
        "LG smart TV",

        # Technical words
        "Keycloak",
        "WhisperX",
        "FastAPI",
        "React Vite",
        "PostgreSQL",
        "Redis",
        "Kafka",
        "Docker Compose",

        # Heteronyms, keep for model-context observation only
        "I read books.",
        "I read yesterday.",
        "Please lead the team.",
        "made of lead",
        "strong wind",
        "wind the clock",

        # Contractions
        "I'm Alex.",
        "I can't go.",
        "I'll arrive.",
        "Don't worry.",
        "We'll call you.",
        "8 o'clock",
    ]

    total = 0
    empty = 0
    errors = 0

    for index, text in enumerate(tests, start=1):
        total += 1

        try:
            prepared_text = normalize_text_for_phonemizer(text)

            raw_ipa = get_ipa(
                text,
                keep_stress=True,
                normalize=False,
                remove_length=False,
                remove_punctuation=False,
                as_string=True,
                normalize_text=True,
            )

            normalized_ipa = get_ipa(
                text,
                keep_stress=True,
                normalize=True,
                remove_length=False,
                remove_punctuation=False,
                as_string=True,
                normalize_text=True,
            )

            phoneme_tokens = get_ipa(
                text,
                keep_stress=True,
                normalize=True,
                remove_length=False,
                remove_punctuation=True,
                as_string=False,
                normalize_text=True,
            )

            label = "OK" if raw_ipa else "EMPTY"

            if not raw_ipa:
                empty += 1

            print(f"[{index:02d}] {label} | tokens={len(phoneme_tokens):03d}")
            print(f"     TEXT: {text}")
            print(f"     PREP: {prepared_text}")
            print(f"     IPA : /{normalized_ipa}/")
            print("-" * 80)

        except Exception as e:
            errors += 1
            print(f"[{index:02d}] ERROR | {text} | {e}")
            print("-" * 80)

    print("=" * 80)
    print(f"SUMMARY | total={total} | empty={empty} | errors={errors}")
    print("=" * 80)