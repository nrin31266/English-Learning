# src/services/phoneme_alignment_service.py

"""
Phoneme Alignment Service - ALIGNMENT & SCORING with OpenPhonemizer
- Levenshtein alignment for correct phoneme matching
- 6 diff types: MATCH, MISMATCH, MISSING, EXTRA, STRESS, PUNCT
- STRESS and PUNCT do NOT affect score
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


# Common multi-character IPA symbols
MULTI_CHAR_IPA = [
    "tʃ", "dʒ",
    "aɪ", "aʊ", "eɪ", "oʊ", "ɔɪ",
    "iː", "uː", "ɜː", "ɔː", "ɑː",   # 🔥 THÊM DÒNG NÀY
    "æ",
    "ɪə", "ʊə", "eə",
    "θ", "ð", "ʃ", "ʒ", "ŋ", "ər",
]

# Stress markers
STRESS_MARKERS = {"ˈ", "ˌ"}

# Punctuation markers
PUNCT_MARKERS = {".", ",", "?", "!", ";", ":", '"', "(", ")", "[", "]", "{", "}", "-", "'"}


def _get_token_type(token: str) -> str:
    """Return type of token: PHONEME, STRESS, or PUNCT"""
    if token in STRESS_MARKERS:
        return "STRESS"
    if token in PUNCT_MARKERS:
        return "PUNCT"
    return "PHONEME"


def _ipa_to_token_list(ipa: str) -> List[Dict]:
    """
    Convert IPA string to list of token objects.
    Each object: {"value": str, "type": "PHONEME" | "STRESS" | "PUNCT"}
    """
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
    """Extract only PHONEME type values for core comparison"""
    return [t["value"] for t in tokens if t["type"] == "PHONEME"]


def compare_phonemes_with_alignment(
    expected_tokens: List[Dict],
    actual_tokens: List[Dict],
) -> Tuple[float, List[Dict]]:
    
    exp_phonemes = _extract_phoneme_only(expected_tokens)
    act_phonemes = _extract_phoneme_only(actual_tokens)

    if not exp_phonemes or not act_phonemes:
        return 0.0, [
            {
                "type": "NO_DATA",
                "expected": None,
                "actual": None,
                "position": None,
            }
        ]

    # 👉 Đã tắt anchor_first để DP tự do chạy mượt hơn
    aligned_phoneme_pairs, distance = levenshtein_alignment_with_similarity(
        exp_phonemes, act_phonemes, similarity_threshold=0.5, anchor_first=False
    )

    max_len = max(len(exp_phonemes), len(act_phonemes))
    score = 1.0 - (distance / max_len) if max_len > 0 else 1.0

    diff_tokens = []
    pos = 0

    exp_token_idx = 0
    act_token_idx = 0

    for exp_phoneme, act_phoneme in aligned_phoneme_pairs:
        # Xử lý STRESS/PUNCT dư thừa phía expected
        while (
            exp_token_idx < len(expected_tokens)
            and expected_tokens[exp_token_idx]["type"] != "PHONEME"
        ):
            exp_token = expected_tokens[exp_token_idx]
            matching_act = None
            
            temp_idx = act_token_idx
            while (
                temp_idx < len(actual_tokens)
                and actual_tokens[temp_idx]["type"] != "PHONEME"
            ):
                act_token = actual_tokens[temp_idx]
                if act_token["value"] == exp_token["value"]:
                    matching_act = act_token
                    # Đẩy các dấu extra trước đó vào
                    for k in range(act_token_idx, temp_idx):
                        diff_tokens.append({
                            "type": actual_tokens[k]["type"],
                            "expected": None,
                            "actual": actual_tokens[k]["value"],
                            "position": pos,
                        })
                        pos += 1
                    act_token_idx = temp_idx + 1
                    break
                temp_idx += 1

            if matching_act:
                diff_tokens.append({
                    "type": exp_token["type"],
                    "expected": exp_token["value"],
                    "actual": matching_act["value"],
                    "position": pos,
                })
            else:
                diff_tokens.append({
                    "type": exp_token["type"],
                    "expected": exp_token["value"],
                    "actual": None,
                    "position": pos,
                })
            pos += 1
            exp_token_idx += 1

        # Xử lý STRESS/PUNCT dư thừa phía actual
        while (
            act_token_idx < len(actual_tokens)
            and actual_tokens[act_token_idx]["type"] != "PHONEME"
        ):
            act_token = actual_tokens[act_token_idx]
            diff_tokens.append({
                "type": act_token["type"],
                "expected": None,
                "actual": act_token["value"],
                "position": pos,
            })
            pos += 1
            act_token_idx += 1

        # Phân loại phoneme pair
        if exp_phoneme and act_phoneme and exp_phoneme == act_phoneme:
            diff_type = "MATCH"
        elif exp_phoneme and act_phoneme and exp_phoneme != act_phoneme:
            diff_type = "MISMATCH"
        elif exp_phoneme and not act_phoneme:
            diff_type = "MISSING"
        else:
            diff_type = "EXTRA"

        # 👉 FIX CHUẨN XÁC THEO LOGIC CỦA BẠN: Lấy giá trị thẳng từ alignment
        exp_val = exp_phoneme
        act_val = act_phoneme

        diff_tokens.append(
            {"type": diff_type, "expected": exp_val, "actual": act_val, "position": pos}
        )
        pos += 1

        # 👉 CHỈ TĂNG INDEX NẾU PHONEME ĐÓ TỒN TẠI TRONG TOKEN LIST 
        # (Nếu exp_phoneme là None tức là Insert, mảng expected_tokens không bị tiêu thụ)
        if exp_phoneme is not None:
            exp_token_idx += 1
        if act_phoneme is not None:
            act_token_idx += 1

    # Dọn dẹp nốt dấu dư ở cuối
    while exp_token_idx < len(expected_tokens):
        exp_token = expected_tokens[exp_token_idx]
        diff_tokens.append({
            "type": exp_token["type"],
            "expected": exp_token["value"],
            "actual": None,
            "position": pos,
        })
        pos += 1
        exp_token_idx += 1

    while act_token_idx < len(actual_tokens):
        act_token = actual_tokens[act_token_idx]
        diff_tokens.append({
            "type": act_token["type"],
            "expected": None,
            "actual": act_token["value"],
            "position": pos,
        })
        pos += 1
        act_token_idx += 1

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
        return (
            0.0,
            [{
                "type": "NO_DATA", "expected": exp_ipa_display or expected_word,
                "actual": act_ipa_display or actual_word, "position": None,
            }],
            exp_ipa_display, act_ipa_display,
        )

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
        ("practice", "fratic"), # Lỗi sẽ hết sạch ở đây
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
        ("think", "tink"),        # θ -> t
        ("this", "dis"),          # ð -> d
        ("very", "wery"),         # v -> w
        ("rice", "lice"),         # r -> l
        ("glass", "grass"),       # l -> r
        ("ship", "sheep"),        # ɪ <-> iː
        ("full", "fool"),         # ʊ <-> uː
        ("next", "nes"),          # missing 'k','t'
        ("months", "mons"),       # cluster bị drop
        ("asked", "ask"),         # bỏ 't'
        ("friends", "frens"),     # bỏ 'd'
        ("film", "filum"),        # thêm vowel
        ("stop", "sitop"),        # thêm schwa
        ("blue", "bulu"),         # thêm vowel giữa cluster
        ("strengths", "streng"),  
        ("twelfth", "twel"),      
        ("crisps", "crisp"),      
        ("import", "import"),     # noun vs verb stress khác
        ("record", "record"),     
        ("present", "present"),
        ("judge", "juz"),         # dʒ -> z
        ("church", "chuch"),      # tʃ repeat
        ("education", "edukation"),
        ("man", "men"),           # æ -> e
        ("cup", "cap"),           # ʌ -> æ
        ("cot", "caught"),        # ɑ -> ɔ
        ("bed", "bad"),           
        ("hello", "yellow"),
        ("banana", "bandana"),
        ("computer", "commuter"),
        ("a", "a"),
        ("I", "I"),
        ("the", "da"),
        ("to", "tu"),
        ("for", "fo"),
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