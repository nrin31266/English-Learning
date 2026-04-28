# src/services/phoneme_alignment_service.py

"""
Phoneme Alignment Service - ALIGNMENT & SCORING with OpenPhonemizer
- Levenshtein alignment for correct phoneme matching
- Semantic diff types: MATCH, MISMATCH, MISSING, EXTRA, STRESS_MATCH, STRESS_WRONG, PUNCT
- STRESS and PUNCT do NOT affect score
- PUNCT acts as visual anchor only (No diffs for missing/extra punctuation)
"""

import re
from typing import List, Dict, Tuple, Optional

if __name__ == "__main__":
    import sys
    import os

    sys.path.insert(
        0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    )

from src.services.phonemizer_service import get_ipa
from src.utils.sequence_alignment import levenshtein_alignment_with_similarity


MULTI_CHAR_IPA = [
    "tʃ", "dʒ",
    "aɪ", "aʊ", "eɪ", "oʊ", "ɔɪ",
    "iː", "uː", "ɜː", "ɔː", "ɑː",
    "æ",
    "ɪə", "ʊə", "eə",
    "θ", "ð", "ʃ", "ʒ", "ŋ", "ər",
]

STRESS_MARKERS = {"ˈ", "ˌ"}
PUNCT_MARKERS = {".", ",", "?", "!", ";", ":", '"', "(", ")", "[", "]", "{", "}", "-", "'"}


def _get_token_type(token: str) -> str:
    if token in STRESS_MARKERS:
        return "STRESS"
    if token in PUNCT_MARKERS:
        return "PUNCT"
    return "PHONEME"


def _ipa_to_token_list(ipa: str) -> List[Dict]:
    if not ipa:
        return []

    result = []
    i = 0
    while i < len(ipa):
        matched = False
        for sym in MULTI_CHAR_IPA:
            if ipa.startswith(sym, i):
                result.append({"value": sym, "type": "PHONEME"})
                i += len(sym)
                matched = True
                break

        if not matched:
            char = ipa[i]
            token_type = _get_token_type(char)
            result.append({"value": char, "type": token_type})
            i += 1

    return result


def _extract_phoneme_only(tokens: List[Dict]) -> List[str]:
    return [t["value"] for t in tokens if t["type"] == "PHONEME"]


def compare_phonemes_with_alignment(
    expected_tokens: List[Dict],
    actual_tokens: List[Dict],
) -> Tuple[float, List[Dict]]:
    
    exp_phonemes = _extract_phoneme_only(expected_tokens)
    act_phonemes = _extract_phoneme_only(actual_tokens)

    if not exp_phonemes or not act_phonemes:
        return 0.0, [{"type": "NO_DATA", "expected": None, "actual": None, "position": None}]

    aligned_phoneme_pairs, distance = levenshtein_alignment_with_similarity(
        exp_phonemes, act_phonemes, similarity_threshold=0.5, anchor_first=False
    )

    max_len = max(len(exp_phonemes), len(act_phonemes))
    score = 1.0 - (distance / max_len) if max_len > 0 else 1.0

    diff_tokens = []
    pos = 0
    exp_token_idx = 0
    act_token_idx = 0

    def _process_meta_tokens():
        nonlocal exp_token_idx, act_token_idx, pos
        while True:
            exp_is_meta = exp_token_idx < len(expected_tokens) and expected_tokens[exp_token_idx]["type"] != "PHONEME"
            act_is_meta = act_token_idx < len(actual_tokens) and actual_tokens[act_token_idx]["type"] != "PHONEME"

            if exp_is_meta and act_is_meta:
                e_tok = expected_tokens[exp_token_idx]
                a_tok = actual_tokens[act_token_idx]
                
                # Cả hai đều là STRESS
                if e_tok["type"] == "STRESS" and a_tok["type"] == "STRESS":
                    diff_type = "STRESS_MATCH" if e_tok["value"] == a_tok["value"] else "STRESS_WRONG"
                    diff_tokens.append({"type": diff_type, "expected": e_tok["value"], "actual": a_tok["value"], "position": pos})
                    pos += 1
                # Cả hai đều là PUNCT
                elif e_tok["type"] == "PUNCT" and a_tok["type"] == "PUNCT":
                    diff_tokens.append({"type": "PUNCT", "expected": e_tok["value"], "actual": a_tok["value"], "position": pos})
                    pos += 1
                # Lệch kiểu (1 bên STRESS, 1 bên PUNCT)
                else:
                    if e_tok["type"] == "STRESS":
                        diff_tokens.append({"type": "STRESS_WRONG", "expected": e_tok["value"], "actual": None, "position": pos})
                        pos += 1
                    if a_tok["type"] == "STRESS":
                        diff_tokens.append({"type": "STRESS_WRONG", "expected": None, "actual": a_tok["value"], "position": pos})
                        pos += 1
                
                exp_token_idx += 1
                act_token_idx += 1

            elif exp_is_meta:
                e_tok = expected_tokens[exp_token_idx]
                # CHỈ ĐẨY VÀO DIFF NẾU LÀ STRESS. BỎ QUA PUNCT.
                if e_tok["type"] == "STRESS":
                    diff_tokens.append({"type": "STRESS_WRONG", "expected": e_tok["value"], "actual": None, "position": pos})
                    pos += 1
                exp_token_idx += 1

            elif act_is_meta:
                a_tok = actual_tokens[act_token_idx]
                # CHỈ ĐẨY VÀO DIFF NẾU LÀ STRESS. BỎ QUA PUNCT.
                if a_tok["type"] == "STRESS":
                    diff_tokens.append({"type": "STRESS_WRONG", "expected": None, "actual": a_tok["value"], "position": pos})
                    pos += 1
                act_token_idx += 1
            else:
                break

    for exp_phoneme, act_phoneme in aligned_phoneme_pairs:
        _process_meta_tokens()

        if exp_phoneme and act_phoneme and exp_phoneme == act_phoneme:
            diff_type = "MATCH"
        elif exp_phoneme and act_phoneme and exp_phoneme != act_phoneme:
            diff_type = "MISMATCH"
        elif exp_phoneme and not act_phoneme:
            diff_type = "MISSING"
        else:
            diff_type = "EXTRA"

        diff_tokens.append({"type": diff_type, "expected": exp_phoneme, "actual": act_phoneme, "position": pos})
        pos += 1

        if exp_phoneme is not None:
            exp_token_idx += 1
        if act_phoneme is not None:
            act_token_idx += 1

    _process_meta_tokens()

    return round(score, 4), diff_tokens


def compare_words_with_ipa(
    expected_word: str,
    actual_word: str,
    keep_stress: bool = True,
) -> Tuple[float, List[Dict], str, str]:

    exp_ipa_display = get_ipa(
        expected_word, keep_stress=keep_stress, normalize=True,
        remove_length=False, remove_punctuation=False, as_string=True,
    ) or ""

    act_ipa_display = get_ipa(
        actual_word, keep_stress=keep_stress, normalize=True,
        remove_length=False, remove_punctuation=False, as_string=True,
    ) or ""

    if not exp_ipa_display or not act_ipa_display:
        return 0.0, [{"type": "NO_DATA", "expected": exp_ipa_display, "actual": act_ipa_display, "position": None}], exp_ipa_display, act_ipa_display

    exp_tokens = _ipa_to_token_list(exp_ipa_display)
    act_tokens = _ipa_to_token_list(act_ipa_display)

    score, diff_tokens = compare_phonemes_with_alignment(exp_tokens, act_tokens)

    for token in diff_tokens:
        token["expected_ipa"] = token.get("expected")
        token["actual_ipa"] = token.get("actual")

    return score, diff_tokens, exp_ipa_display, act_ipa_display



# ========== MAIN TEST ==========
from src.services.phonemizer_service import _tokenize_phonemes as tokenize_ipa
if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("🔊 PHONEME ALIGNMENT SERVICE - TEST")
    print("=" * 80)

    tests = [
        ("practice", "fratic"), 
        ("hello", "house"),
        ("Hey", "Hi"),
        ("Hello!", "hello"),
        ("Hello, world!", "hello world"),
        ("red.", "red"),
        ("can't", "cant"),
        ("butter", "budder"),
        ("better", "bedder"),
        ("sheep", "ship"),
        ("banana", "bnana"),
        ("cat", "cats"),
        ("record", "record"),
        ("chair", "share"),
        ("photograph", "fotograph"),
        ("", "hello"),
        ("hello", ""),
        ("favourable", "valuable"),
        ("of", "reviews"),
    ]

    for idx, (exp, act) in enumerate(tests, 1):
        try:
            score, diffs, exp_ipa, act_ipa = compare_words_with_ipa(exp, act)
            print(f"\n[{idx}] 📌 {exp}  vs  {act}")
            print(f"   Expected IPA: {exp_ipa}")
            print(f"   Actual IPA:   {act_ipa}")
            print(f"   Score: {round(score, 4) if score is not None else 'N/A'}")
            
            try:
                print(f"   Tokens EXP: {tokenize_ipa(exp_ipa)}")
                print(f"   Tokens ACT: {tokenize_ipa(act_ipa)}")
            except Exception:
                print("   ⚠️ Tokenize failed")
            
            print("   Diffs:")
            if not diffs:
                print("     - (no diffs)")
                continue
            for d in diffs:
                diff_type = d.get("type", "UNKNOWN")
                exp_val = d.get("expected", "-")
                act_val = d.get("actual", "-")
                print(f"     - {diff_type:10}: '{exp_val}' vs '{act_val}'")
        except Exception as e:
            print(f"\n[{idx}] ❌ ERROR with test: {exp} vs {act}")
            print(f"   → {e}")