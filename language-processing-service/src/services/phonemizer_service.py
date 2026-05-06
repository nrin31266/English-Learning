import re
import unicodedata
import logging
from typing import List, Optional, Union

logger = logging.getLogger(__name__)

_phonemizer = None
_loaded = False

# =========================
# PRE-COMPILED PATTERNS (OPTIMIZATION)
# =========================
# Biên dịch trước các Regex để tăng tốc độ xử lý trong loop
STRESS_PATTERN = re.compile(r'[ˈˌ]')
LENGTH_PATTERN = re.compile(r'[ːˑ]')
PUNCTUATION_PATTERN = re.compile(r'[.!?,;:"()\[\]{}\-…—–\']')
WHITESPACE_CLEANUP = re.compile(r'\s+')
WHITESPACE_BEFORE_PUNCT = re.compile(r'\s+([.,!?;:])')

IPA_RULES = [
    (re.compile(r'[ɹɻ]'), 'r'),
    (re.compile(r'ɾ'), 't'),
    (re.compile(r'ɐ'), 'ə'),
    (re.compile(r'ᵻ'), 'ɪ'),
    (re.compile(r'[ɫ]'), 'l'),
    (re.compile(r'ɚ'), 'ər'),
    (re.compile(r'ɜː'), 'ɜr'),
    (re.compile(r'[ʲʷʰ]'), ''), # Gộp các ký tự phụ vào 1 group để xóa nhanh
    (re.compile(r'ⁿ'), 'n'),
    (re.compile(r'ˡ'), 'l'),
]

# Tối ưu Tokenizer bằng Regex bóc tách các âm ghép trước
MULTI_CHARS = ["tʃ", "dʒ", "aɪ", "aʊ", "oʊ", "eɪ", "ɔɪ", "ər", "ɑː", "ɜː", "ɪə", "ʊə", "eə"]
# Pattern này sẽ tìm các âm ghép trước, sau đó đến dấu nhấn, dấu câu, và cuối cùng là ký tự đơn
TOKENIZER_REGEX = re.compile('|'.join(MULTI_CHARS) + r'|[ˈˌ]|' + r'[.,!?;:"()\[\]{}…—–\-\']|.')

# =========================
# HELPERS
# =========================

def _patch_torch_load():
    try:
        import torch
        # Chỉ patch nếu thực sự cần thiết cho version torch hiện tại
        if hasattr(torch, 'load'):
            original_load = torch.load
            def patched_load(*args, **kwargs):
                kwargs['weights_only'] = False
                return original_load(*args, **kwargs)
            torch.load = patched_load
    except ImportError:
        pass

def _ensure_loaded(disable_gpu: bool = False):
    global _phonemizer, _loaded
    if _loaded: return
    
    print("[Phonemizer] Loading OpenPhonemizer model...")
    try:
        _patch_torch_load()
        import torch
        from openphonemizer import OpenPhonemizer
        
        _phonemizer = OpenPhonemizer(disable_gpu=disable_gpu)
        _loaded = True
        
        status = f"GPU: {torch.cuda.get_device_name(0)}" if not disable_gpu and torch.cuda.is_available() else "CPU mode"
        print(f"✅ Ready ({status})")
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
    if not ipa: return ipa

    ipa = unicodedata.normalize("NFKC", ipa)

    if not keep_stress:
        ipa = STRESS_PATTERN.sub('', ipa)

    for pattern, replacement in IPA_RULES:
        ipa = pattern.sub(replacement, ipa)

    if remove_length:
        ipa = LENGTH_PATTERN.sub('', ipa)

    if remove_punctuation:
        ipa = PUNCTUATION_PATTERN.sub('', ipa)
    else:
        ipa = WHITESPACE_BEFORE_PUNCT.sub(r'\1', ipa)

    return WHITESPACE_CLEANUP.sub(' ', ipa).strip()

def _tokenize_phonemes(ipa: str) -> List[str]:
    """Sử dụng Regex tokenizer để tăng tốc độ bóc tách âm"""
    if not ipa: return []
    #findall kết hợp với pattern đã sắp xếp thứ tự ưu tiên sẽ bóc tách cực nhanh
    return [t for t in TOKENIZER_REGEX.findall(ipa) if not t.isspace()]

# =========================
# CORE LOGIC (REFACTORED)
# =========================

def _get_raw_ipa(text: str, keep_stress: bool, disable_gpu: bool) -> Optional[str]:
    """Hàm base để tránh lặp code giữa get_phonemes và get_ipa"""
    _ensure_loaded(disable_gpu=disable_gpu)
    if not _phonemizer or not text or not text.strip():
        return None
    
    try:
        return _phonemizer(text.strip(), stress=keep_stress).strip()
    except Exception as e:
        logger.error(f"Phonemization failed: {e}")
        return None

def get_phonemes(text: str, **kwargs) -> Optional[List[str]]:
    # Tái sử dụng hàm get_ipa để giữ tính nhất quán
    kwargs['as_string'] = False
    return get_ipa(text, **kwargs)

def get_ipa(
    text: str,
    keep_stress: bool = True,
    normalize: bool = True,
    remove_length: bool = False,
    as_string: bool = True,
    disable_gpu: bool = False,
    remove_punctuation: bool = True,
) -> Optional[Union[str, List[str]]]:

    raw_ipa = _get_raw_ipa(text, keep_stress, disable_gpu)
    if raw_ipa is None: 
        return "" if as_string else []

    if normalize:
        raw_ipa = _normalize_ipa(
            raw_ipa,
            keep_stress=keep_stress,
            remove_length=remove_length,
            remove_punctuation=remove_punctuation
        )

    return raw_ipa if as_string else _tokenize_phonemes(raw_ipa)

# =========================
# LIFECYCLE
# =========================

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
    except: pass
    print("[Phonemizer] Unloaded")