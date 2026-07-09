# src/services/shadowing/phoneme_alignment_service.py

"""
Phoneme Alignment Service

Responsibilities:
- Convert IPA strings into typed tokens.
- Align only phoneme tokens.
- Merge stress/punctuation metadata back into the final diff result.
"""

import os
import sys
from typing import Any

if __name__ == "__main__":
    sys.path.insert(
        0,
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")),
    )

from src.services.shadowing.phonemizer_service import get_ipa
from src.services.shadowing.sequence_alignment import levenshtein_alignment_with_similarity

Token = dict[str, Any]
DiffToken = dict[str, Any]

MULTI_CHAR_IPA = [
    "tʃ",
    "dʒ",
    "aɪ",
    "aʊ",
    "eɪ",
    "oʊ",
    "ɔɪ",
    "iː",
    "uː",
    "ɜr",
    "ɔː",
    "ɑː",
    "ɪə",
    "ʊə",
    "eə",
    "ər",
]

# Longest first, so tokenization does not split "tʃ" into "t" + "ʃ".
MULTI_CHAR_IPA = sorted(MULTI_CHAR_IPA, key=len, reverse=True)

STRESS_MARKERS = {"ˈ", "ˌ"}
PUNCT_MARKERS = {
    ".",
    ",",
    "?",
    "!",
    ";",
    ":",
    '"',
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "-",
    "'",
}


def _token_type(token: str) -> str:
    if token in STRESS_MARKERS:
        return "STRESS"

    if token in PUNCT_MARKERS:
        return "PUNCT"

    return "PHONEME"


def _ipa_to_tokens(ipa: str) -> list[Token]:
    if not ipa:
        return []

    tokens: list[Token] = []
    index = 0

    while index < len(ipa):
        matched = None

        for symbol in MULTI_CHAR_IPA:
            if ipa.startswith(symbol, index):
                matched = symbol
                break

        if matched:
            tokens.append({"value": matched, "type": "PHONEME"})
            index += len(matched)
            continue

        char = ipa[index]

        if not char.isspace():
            tokens.append({"value": char, "type": _token_type(char)})

        index += 1

    return tokens


def _phonemes_only(tokens: list[Token]) -> list[str]:
    return [token["value"] for token in tokens if token["type"] == "PHONEME"]


def _new_diff(
    diff_type: str,
    expected: str | None,
    actual: str | None,
    position: int | None,
) -> DiffToken:
    return {
        "type": diff_type,
        "expected": expected,
        "actual": actual,
        "position": position,
    }


def _add_ipa_fields(diff_tokens: list[DiffToken]) -> list[DiffToken]:
    for token in diff_tokens:
        token["expected_ipa"] = token.get("expected")
        token["actual_ipa"] = token.get("actual")

    return diff_tokens


def _append_meta_diff(
    diff_tokens: list[DiffToken],
    expected_token: Token | None,
    actual_token: Token | None,
    position: int,
) -> int:
    """
    Add stress/punctuation diff tokens.

    Stress is meaningful for pronunciation scoring.
    Punctuation is kept only for display/context.
    Extra actual metadata is ignored because it usually comes from model noise.
    """
    expected_type = expected_token["type"] if expected_token else None
    actual_type = actual_token["type"] if actual_token else None

    if expected_type == "STRESS" and actual_type == "STRESS":
        diff_type = (
            "STRESS_MATCH"
            if expected_token["value"] == actual_token["value"]
            else "STRESS_WRONG"
        )

        diff_tokens.append(
            _new_diff(
                diff_type,
                expected_token["value"],
                actual_token["value"],
                position,
            )
        )

        return position + 1

    if expected_type == "STRESS":
        diff_tokens.append(
            _new_diff(
                "STRESS_WRONG",
                expected_token["value"],
                actual_token["value"] if actual_token else None,
                position,
            )
        )

        return position + 1

    if expected_type == "PUNCT" and actual_type == "PUNCT":
        diff_tokens.append(
            _new_diff(
                "PUNCT",
                expected_token["value"],
                actual_token["value"],
                position,
            )
        )

        return position + 1

    return position


def _consume_meta_tokens(
    expected_tokens: list[Token],
    actual_tokens: list[Token],
    expected_index: int,
    actual_index: int,
    position: int,
    diff_tokens: list[DiffToken],
) -> tuple[int, int, int]:
    while True:
        expected_meta = (
            expected_index < len(expected_tokens)
            and expected_tokens[expected_index]["type"] != "PHONEME"
        )
        actual_meta = (
            actual_index < len(actual_tokens)
            and actual_tokens[actual_index]["type"] != "PHONEME"
        )

        if not expected_meta and not actual_meta:
            break

        expected_token = expected_tokens[expected_index] if expected_meta else None
        actual_token = actual_tokens[actual_index] if actual_meta else None

        position = _append_meta_diff(
            diff_tokens,
            expected_token,
            actual_token,
            position,
        )

        if expected_meta:
            expected_index += 1

        if actual_meta:
            actual_index += 1

        # If only actual meta exists, it is consumed but not displayed/scored.

    return expected_index, actual_index, position


def _diff_type(expected_phoneme: str | None, actual_phoneme: str | None) -> str:
    if expected_phoneme and actual_phoneme:
        return "MATCH" if expected_phoneme == actual_phoneme else "MISMATCH"

    if expected_phoneme and not actual_phoneme:
        return "MISSING"

    return "EXTRA"


def compare_phonemes_with_alignment(
    expected_tokens: list[Token],
    actual_tokens: list[Token],
) -> tuple[float, list[DiffToken]]:
    expected_phonemes = _phonemes_only(expected_tokens)
    actual_phonemes = _phonemes_only(actual_tokens)

    if not expected_phonemes or not actual_phonemes:
        return 0.0, [
            _new_diff(
                "NO_DATA",
                None,
                None,
                None,
            )
        ]

    aligned_pairs, distance = levenshtein_alignment_with_similarity(
        expected_phonemes,
        actual_phonemes,
        similarity_threshold=0.5,
        anchor_first=False,
    )

    max_len = max(len(expected_phonemes), len(actual_phonemes))
    score = max(0.0, 1.0 - (distance / max_len)) if max_len > 0 else 1.0

    diff_tokens: list[DiffToken] = []

    expected_index = 0
    actual_index = 0
    position = 0

    for expected_phoneme, actual_phoneme in aligned_pairs:
        expected_index, actual_index, position = _consume_meta_tokens(
            expected_tokens,
            actual_tokens,
            expected_index,
            actual_index,
            position,
            diff_tokens,
        )

        diff_tokens.append(
            _new_diff(
                _diff_type(expected_phoneme, actual_phoneme),
                expected_phoneme,
                actual_phoneme,
                position,
            )
        )

        position += 1

        if expected_phoneme is not None:
            expected_index += 1

        if actual_phoneme is not None:
            actual_index += 1

    _consume_meta_tokens(
        expected_tokens,
        actual_tokens,
        expected_index,
        actual_index,
        position,
        diff_tokens,
    )

    return round(score, 4), diff_tokens


def compare_words_with_ipa(
    expected_word: str,
    actual_word: str,
    keep_stress: bool = True,
) -> tuple[float, list[DiffToken], str, str]:
    expected_ipa = get_ipa(
        expected_word,
        keep_stress=keep_stress,
        normalize=True,
        remove_length=False,
        remove_punctuation=False,
        as_string=True,
    ) or ""

    actual_ipa = get_ipa(
        actual_word,
        keep_stress=keep_stress,
        normalize=True,
        remove_length=False,
        remove_punctuation=False,
        as_string=True,
    ) or ""

    if not expected_ipa or not actual_ipa:
        return (
            0.0,
            _add_ipa_fields(
                [
                    _new_diff(
                        "NO_DATA",
                        expected_ipa or None,
                        actual_ipa or None,
                        None,
                    )
                ]
            ),
            expected_ipa,
            actual_ipa,
        )

    expected_tokens = _ipa_to_tokens(expected_ipa)
    actual_tokens = _ipa_to_tokens(actual_ipa)

    score, diff_tokens = compare_phonemes_with_alignment(
        expected_tokens,
        actual_tokens,
    )

    return score, _add_ipa_fields(diff_tokens), expected_ipa, actual_ipa


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("PHONEME ALIGNMENT SYSTEM - STRESS TEST REPORT")
    print("=" * 80)

    tests = [
        ("better", "bedder"),
        ("sheep", "ship"),
        ("think", "sink"),
        ("exercises", "exercise"),
        ("test", "tets"),
        ("asked", "ast"),
        ("months", "muns"),
        ("comfortable", "comf-table"),
        ("probably", "prolly"),
        ("temperature", "tempritur"),
        ("the", "za"),
        ("everything", "evritin"),
        ("specifically", "specifly"),
        ("a", "an"),
        ("strength", "strenth"),
        ("rhythm", "ridim"),
        ("Hi, how are you?", "Hi, how are you?"),
    ]

    for index, (expected, actual) in enumerate(tests, start=1):
        try:
            score, diffs, expected_ipa, actual_ipa = compare_words_with_ipa(
                expected,
                actual,
            )

            status = "PASS" if score >= 0.8 else "REVIEW"

            print(
                f"[{index:02d}] {expected:15} vs {actual:15} "
                f"| score={score:.4f} | {status}"
            )
            print(f"    EXP: /{expected_ipa}/")
            print(f"    ACT: /{actual_ipa}/")

            issues = [
                diff
                for diff in diffs
                if diff["type"] not in {"MATCH", "PUNCT", "STRESS_MATCH"}
            ]

            if issues:
                issue_text = " | ".join(
                    f"{item['type']}({item['expected']}->{item['actual']})"
                    for item in issues
                )
                print(f"    Issues: {issue_text}")
            else:
                print("    Perfect phoneme match")

            print("-" * 50)

        except Exception as e:
            print(f"[{index:02d}] ERROR {expected} vs {actual}: {e}")

    print("=" * 80)
    print("TEST COMPLETED")