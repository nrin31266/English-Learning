# src/services/phoneme_alignment_service.py

"""
Phoneme Alignment Service
- Chịu trách nhiệm xử lý string IPA thành mảng Token.
- Bóc tách Meta tokens (STRESS, PUNCT) khỏi luồng align.
- Merge lại thành kết quả Diff hoàn chỉnh.
"""

import os
import sys
from typing import List, Dict, Tuple

if __name__ == "__main__":
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.services.phonemizer_service import get_ipa
from src.utils.sequence_alignment import levenshtein_alignment_with_similarity

# Định nghĩa các âm ghép. Quan trọng để tokenizer không chẻ đôi,
# giúp ma trận SIMILAR_PHONEMES có thể bắt cặp chính xác (vd: eɪ -> aɪ).
MULTI_CHAR_IPA = [
    "tʃ", "dʒ",
    "aɪ", "aʊ", "eɪ", "oʊ", "ɔɪ",
    "iː", "uː", "ɜr", "ɔː", "ɑː",
    "ɪə", "ʊə", "eə",
    "ər",
]

STRESS_MARKERS = {"ˈ", "ˌ"}
PUNCT_MARKERS = {".", ",", "?", "!", ";", ":", '"', "(", ")", "[", "]", "{", "}", "-", "'"}

def _get_token_type(token: str) -> str:
    if token in STRESS_MARKERS: return "STRESS"
    if token in PUNCT_MARKERS: return "PUNCT"
    return "PHONEME"

def _ipa_to_token_list(ipa: str) -> List[Dict]:
    """Tokenize chuỗi IPA thành Object phân loại (PHONEME/STRESS/PUNCT)"""
    if not ipa: return []

    result = []
    i = 0
    while i < len(ipa):
        matched = False
        # 1. Bắt các âm ghép nhiều ký tự
        for sym in MULTI_CHAR_IPA:
            if ipa.startswith(sym, i):
                result.append({"value": sym, "type": "PHONEME"})
                i += len(sym)
                matched = True
                break

        # 2. Xử lý các ký tự đơn (Phụ âm, nguyên âm ngắn, dấu meta)
        if not matched:
            char = ipa[i]
            result.append({"value": char, "type": _get_token_type(char)})
            i += 1

    return result

def _extract_phoneme_only(tokens: List[Dict]) -> List[str]:
    return [t["value"] for t in tokens if t["type"] == "PHONEME"]

def compare_phonemes_with_alignment(
    expected_tokens: List[Dict],
    actual_tokens: List[Dict],
) -> Tuple[float, List[Dict]]:
    """
    So sánh 2 mảng IPA tokens.
    Sử dụng Levenshtein DP để map Phoneme, sau đó nhồi Meta tokens lại vào luồng.
    """
    exp_phonemes = _extract_phoneme_only(expected_tokens)
    act_phonemes = _extract_phoneme_only(actual_tokens)

    if not exp_phonemes or not act_phonemes:
        return 0.0, [{"type": "NO_DATA", "expected": None, "actual": None, "position": None}]

    # Align mảng âm thanh
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
        """Hàm nội bộ xử lý nhồi dấu nhấn, dấu câu vào lại vị trí gốc"""
        nonlocal exp_token_idx, act_token_idx, pos
        while True:
            exp_is_meta = exp_token_idx < len(expected_tokens) and expected_tokens[exp_token_idx]["type"] != "PHONEME"
            act_is_meta = act_token_idx < len(actual_tokens) and actual_tokens[act_token_idx]["type"] != "PHONEME"

            if exp_is_meta and act_is_meta:
                e_tok = expected_tokens[exp_token_idx]
                a_tok = actual_tokens[act_token_idx]
                
                if e_tok["type"] == "STRESS" and a_tok["type"] == "STRESS":
                    diff_type = "STRESS_MATCH" if e_tok["value"] == a_tok["value"] else "STRESS_WRONG"
                    diff_tokens.append({"type": diff_type, "expected": e_tok["value"], "actual": a_tok["value"], "position": pos})
                    pos += 1
                elif e_tok["type"] == "PUNCT" and a_tok["type"] == "PUNCT":
                    diff_tokens.append({"type": "PUNCT", "expected": e_tok["value"], "actual": a_tok["value"], "position": pos})
                    pos += 1
                else:
                    if e_tok["type"] == "STRESS":
                        diff_tokens.append({"type": "STRESS_WRONG", "expected": e_tok["value"], "actual": None, "position": pos})
                        pos += 1
                
                exp_token_idx += 1
                act_token_idx += 1

            elif exp_is_meta:
                e_tok = expected_tokens[exp_token_idx]
                # Phạt lỗi thiếu dấu nhấn. Bỏ qua dấu câu (PUNCT).
                if e_tok["type"] == "STRESS":
                    diff_tokens.append({"type": "STRESS_WRONG", "expected": e_tok["value"], "actual": None, "position": pos})
                    pos += 1
                exp_token_idx += 1

            elif act_is_meta:
                # Bỏ qua meta rác từ Actual (vd: đọc sai nhấn âm nhưng gốc không có nhấn)
                act_token_idx += 1
            else:
                break

    # Build mảng diff cuối cùng
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

        if exp_phoneme is not None: exp_token_idx += 1
        if act_phoneme is not None: act_token_idx += 1

    _process_meta_tokens()

    return round(score, 4), diff_tokens

def compare_words_with_ipa(
    expected_word: str,
    actual_word: str,
    keep_stress: bool = True,
) -> Tuple[float, List[Dict], str, str]:
    """Wrapper function xử lý từ text -> IPA -> Align Score"""
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
if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("🔊 PHONEME ALIGNMENT SYSTEM - STRESS TEST REPORT")
    print("=" * 80)

    tests = [
        # --- BASIC & SIMILARITY ---
        ("better", "bedder"),       # Flapping T/D
        ("sheep", "ship"),           # Tense/Lax Vowels
        ("think", "sink"),           # Th-fronting (θ vs s)
        
        # --- CLUSTERS & ENDINGS (Thử thách Tie-breaking) ---
        ("exercises", "exercise"),   # Missing plural ending
        ("test", "tets"),            # Swap ending consonants
        ("asked", "ast"),            # Consonant cluster reduction
        ("months", "muns"),          # Complex cluster /nθs/
        
        # --- MULTI-SYLLABIC & REDUCTION ---
        ("comfortable", "comf-table"), # Syllable deletion
        ("probably", "prolly"),        # Standard spoken reduction
        ("temperature", "tempritur"),  # Vowel reduction
        
        # --- WORD BOUNDARY & NOISE ---
        ("the", "za"),               # Voiced th (ð vs z)
        ("everything", "evritin"),    # Common mispronunciation
        ("specifically", "specifly"), # Large syllable skip
        
        # --- EDGE CASES ---
        ("a", "an"),                 # Addition
        ("strength", "strenth"),     # /ŋθ/ vs /nθ/
        ("rhythm", "ridim"),         # /ðm/ vs /dim/
    ]

    for idx, (exp, act) in enumerate(tests, 1):
        try:
            score, diffs, exp_ipa, act_ipa = compare_words_with_ipa(exp, act)
            
            # Log gọn gàng theo dòng
            status = "✅ PASS" if score >= 0.8 else "⚠️ REVIEW"
            print(f"[{idx:02d}] {exp:15} vs {act:15} | Score: {score:.4f} | {status}")
            print(f"    EXP: /{exp_ipa}/")
            print(f"    ACT: /{act_ipa}/")
            
            # Chỉ in các lỗi (Mismatch, Missing, Extra, Stress_wrong)
            issues = [d for d in diffs if d['type'] not in ['MATCH', 'PUNCT', 'STRESS_MATCH']]
            if issues:
                diff_str = " | ".join([f"{i['type']}({i['expected']}->{i['actual']})" for i in issues])
                print(f"    👉 Issues: {diff_str}")
            else:
                print(f"    ✨ Perfect Phoneme Match")
            print("-" * 50)

        except Exception as e:
            print(f"[{idx:02d}] ❌ ERROR {exp} vs {act}: {e}")

    print("=" * 80)
    print("TEST COMPLETED")