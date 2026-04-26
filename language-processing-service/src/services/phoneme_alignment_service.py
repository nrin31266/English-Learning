# src/services/phoneme_alignment_service.py
"""
Phoneme Alignment Service - ALIGNMENT & SCORING with OpenPhonemizer
- Compare phoneme sequences
- Levenshtein alignment
- Return diff visualization
"""

import re
from typing import List, Dict, Tuple
if __name__ == "__main__":
    import sys
    import os
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from src.services.phonemizer_service import get_ipa
from src.utils.sequence_alignment import levenshtein_alignment


# Common multi-character IPA symbols (for proper splitting)
MULTI_CHAR_IPA = ['tʃ', 'dʒ', 'aɪ', 'aʊ', 'eɪ', 'oʊ', 'ɔɪ', 'ɑː', 'æ', 'ɜː', 'ɪə', 'ʊə', 'eə', 'θ', 'ð', 'ʃ', 'ʒ', 'ŋ', 'ər']


def _ipa_to_phoneme_list(ipa: str) -> List[str]:
    """
    Convert IPA string to list of phoneme symbols.
    Handles multi-character IPA symbols like tʃ, dʒ, aɪ, etc.
    """
    if not ipa:
        return []
    
    result = []
    i = 0
    while i < len(ipa):
        matched = False
        for sym in MULTI_CHAR_IPA:
            if ipa.startswith(sym, i):
                result.append(sym)
                i += len(sym)
                matched = True
                break
        if not matched:
            if ipa[i] not in ['ˈ', 'ˌ']:
                result.append(ipa[i])
            i += 1
    
    return result


def compare_phonemes(
    expected_phonemes: List[str],
    actual_phonemes: List[str]
) -> Tuple[float, List[Dict]]:
    """
    Compare two phoneme sequences.
    
    Args:
        expected_phonemes: List of expected phonemes
        actual_phonemes: List of actual phonemes
    
    Returns:
        (score, diff_tokens)
    """
    if not expected_phonemes or not actual_phonemes:
        return 0.0, [{
            "type": "NO_DATA",
            "expected": None,
            "actual": None,
            "position": None,
        }]
    
    aligned_pairs, distance = levenshtein_alignment(expected_phonemes, actual_phonemes)
    
    max_len = max(len(expected_phonemes), len(actual_phonemes))
    score = 1.0 - (distance / max_len) if max_len > 0 else 1.0
    
    diff_tokens = []
    pos = 0
    for exp_p, act_p in aligned_pairs:
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
            "expected": exp_p,
            "actual": act_p,
            "position": pos
        })
        pos += 1
    
    return round(score, 4), diff_tokens


def compare_words_with_ipa(
    expected_word: str,
    actual_word: str,
    keep_stress: bool = True,
) -> Tuple[float, List[Dict], str, str]:
    
    # Dùng cho SO SÁNH: bỏ punctuation
    exp_ipa_compare = get_ipa(
        expected_word, 
        keep_stress=keep_stress, 
        normalize=True, 
        remove_length=True,
        remove_punctuation=True,  # BỎ punctuation để so sánh
        as_string=True
    ) or ""
    
    act_ipa_compare = get_ipa(
        actual_word, 
        keep_stress=keep_stress, 
        normalize=True, 
        remove_length=True,
        remove_punctuation=True,  # BỎ punctuation để so sánh
        as_string=True
    ) or ""
    
    # Dùng cho HIỂN THỊ: giữ punctuation
    exp_ipa_display = get_ipa(
        expected_word, 
        keep_stress=keep_stress, 
        normalize=True, 
        remove_length=False,
        remove_punctuation=False,  # GIỮ punctuation để hiển thị
        as_string=True
    ) or ""
    
    act_ipa_display = get_ipa(
        actual_word, 
        keep_stress=keep_stress, 
        normalize=True, 
        remove_length=False,
        remove_punctuation=False,  # GIỮ punctuation để hiển thị
        as_string=True
    ) or ""
    
    if not exp_ipa_compare or not act_ipa_compare:
        return 0.0, [{
            "type": "NO_DATA",
            "expected": exp_ipa_display,
            "actual": act_ipa_display,
            "position": None,
        }], exp_ipa_display, act_ipa_display
    
    exp_phonemes = _ipa_to_phoneme_list(exp_ipa_compare)
    act_phonemes = _ipa_to_phoneme_list(act_ipa_compare)
    
    score, diff_tokens = compare_phonemes(exp_phonemes, act_phonemes)
    
    for token in diff_tokens:
        token["expected_ipa"] = token.get("expected")
        token["actual_ipa"] = token.get("actual")
    
    return score, diff_tokens, exp_ipa_display, act_ipa_display



# ========== MAIN TEST ==========
if __name__ == "__main__":
    expected = "red."
    actual = "led"
    
    score, diffs, exp_ipa, act_ipa = compare_words_with_ipa(expected, actual)
    
    print(f"Expected: {expected} -> {exp_ipa}")
    print(f"Actual:   {actual} -> {act_ipa}")
    print(f"Score: {score}")
    print("Diffs:")
    for d in diffs:
        print(d)