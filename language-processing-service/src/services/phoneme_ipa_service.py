# src/services/phoneme_ipa_service.py
"""
Phoneme IPA Service:
- ARPABET → IPA mapping
- So sánh phoneme sequence (dùng shared alignment)
- Trả về diff visualization
"""
import re
from typing import List, Dict, Optional, Tuple
from src.services.cmu_service import get_phonemes
from src.utils.sequence_alignment import levenshtein_alignment


ARPABET_TO_IPA: Dict[str, str] = {
    "AA": "ɑː", "AE": "æ", "AH": "ʌ", "AO": "ɔː",
    "AW": "aʊ", "AY": "aɪ", "EH": "e", "ER": "ɜː",
    "EY": "eɪ", "IH": "ɪ", "IY": "iː", "OW": "oʊ",
    "OY": "ɔɪ", "UH": "ʊ", "UW": "uː",
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð",
    "F": "f", "G": "ɡ", "HH": "h", "JH": "dʒ",
    "K": "k", "L": "l", "M": "m", "N": "n",
    "NG": "ŋ", "P": "p", "R": "r", "S": "s",
    "SH": "ʃ", "T": "t", "TH": "θ", "V": "v",
    "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ",
}


def arpabet_to_ipa(arpabet_list: List[str]) -> List[str]:
    """Chuyển ARPABET sequence sang IPA (không stress)"""
    return [ARPABET_TO_IPA.get(p, p.lower()) for p in arpabet_list]


def arpabet_to_ipa_with_stress(arpabet_list: List[str]) -> str:
    """
    Chuyển ARPABET (có stress markers) sang IPA có dấu nhấn.
    Ví dụ: ['W', 'EH1', 'L', 'K', 'AH0', 'M'] → 'ˈwɛlkəm'
    """
    ipa_parts = []
    for p in arpabet_list:
        # Tách stress marker
        if p.endswith('1'):
            base = p[:-1]
            ipa = ARPABET_TO_IPA.get(base, base.lower())
            ipa_parts.append(f"ˈ{ipa}")
        elif p.endswith('2'):
            base = p[:-1]
            ipa = ARPABET_TO_IPA.get(base, base.lower())
            ipa_parts.append(f"ˌ{ipa}")
        else:
            # Không stress - vẫn phải map qua dictionary
            # Ví dụ: 'AH0' → base 'AH' → 'ʌ'
            base = re.sub(r'[0-9]', '', p)  # Xóa số nếu có
            ipa = ARPABET_TO_IPA.get(base, base.lower())
            ipa_parts.append(ipa)
    
    return "".join(ipa_parts)


def get_ipa_string(word: str) -> Optional[str]:
    """Lấy IPA string của từ (không stress)"""
    phonemes = get_phonemes(word)
    if not phonemes:
        return None
    return "".join(arpabet_to_ipa(phonemes))


def get_ipa_string_with_stress(word: str) -> Optional[str]:
    """Lấy IPA string của từ (có stress)"""
    from src.services.cmu_service import get_phonemes_with_stress
    phonemes = get_phonemes_with_stress(word)
    if not phonemes:
        return None
    return arpabet_to_ipa_with_stress(phonemes)


def compare_phonemes_with_ipa(
    expected_word: str,
    recognized_word: str
) -> Tuple[float, List[Dict]]:
    """
    So sánh phoneme giữa 2 từ (không stress).
    
    Returns:
        (score, diff_tokens)
    """
    exp_phonemes = get_phonemes(expected_word)
    rec_phonemes = get_phonemes(recognized_word)
    
    if not exp_phonemes or not rec_phonemes:
        return 0.0, [{"type": "NO_DATA"}]
    
    aligned_pairs, distance = levenshtein_alignment(exp_phonemes, rec_phonemes)
    
    max_len = max(len(exp_phonemes), len(rec_phonemes))
    score = 1.0 - (distance / max_len) if max_len > 0 else 1.0
    
    diff_tokens = []
    pos = 0
    for exp_p, act_p in aligned_pairs:
        exp_ipa = ARPABET_TO_IPA.get(exp_p, exp_p.lower()) if exp_p else None
        act_ipa = ARPABET_TO_IPA.get(act_p, act_p.lower()) if act_p else None
        
        if exp_p and act_p and exp_p == act_p:
            diff_type = "MATCH"
        elif exp_p and act_p and exp_p != act_p:
            diff_type = "MISMATCH"
        elif exp_p and not act_p:
            diff_type = "MISSING"
        else:
            diff_type = "EXTRA"
        
        diff_tokens.append({
            "type": diff_type,
            "expected_ipa": exp_ipa,
            "actual_ipa": act_ipa,
            "position": pos
        })
        pos += 1
    
    return round(score, 4), diff_tokens


def compare_phonemes_with_ipa_and_stress(
    expected_word: str,
    recognized_word: str
) -> Tuple[float, List[Dict], str, str]:
    """
    So sánh phoneme (không stress) nhưng trả về IPA có stress để UI hiển thị.
    
    """
    # So sánh trên phiên bản không stress
    score, diff_tokens = compare_phonemes_with_ipa(expected_word, recognized_word)
    
   
    return score, diff_tokens