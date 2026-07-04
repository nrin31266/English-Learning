# src/services/shadowing/phoneme_ipa_service.py

"""
Backward-compatible IPA helpers for shadowing.

This module keeps the old public function names while delegating real work to:
- phonemizer_service.py
- phoneme_alignment_service.py
"""

from typing import Any


import os
import sys
if __name__ == "__main__":
    sys.path.insert(
        0,
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")),
    )
from src.services.shadowing.phoneme_alignment_service import compare_words_with_ipa
from src.services.shadowing.phonemizer_service import (
    get_ipa as _get_ipa,
    preload,
    unload,
)
def compare_phonemes_with_ipa(
    expected_word: str,
    actual_word: str,
) -> tuple[float, list[dict[str, Any]]]:
    """
    Compare two words by IPA phoneme alignment.

    Kept for backward compatibility with older shadowing code.
    """
    score, diff_tokens, _, _ = compare_words_with_ipa(
        expected_word,
        actual_word,
        keep_stress=True,
    )

    return score, diff_tokens


def get_ipa_string(word: str) -> str:
    """
    Return normalized IPA without stress marks.
    """
    result = _get_ipa(
        word,
        keep_stress=False,
        normalize=True,
        remove_length=False,
        remove_punctuation=True,
        as_string=True,
    )

    return result if isinstance(result, str) else ""


def get_ipa_string_with_stress(word: str) -> str:
    """
    Return normalized IPA with stress marks.
    """
    result = _get_ipa(
        word,
        keep_stress=True,
        normalize=True,
        remove_length=False,
        remove_punctuation=False,
        as_string=True,
    )

    return result if isinstance(result, str) else ""


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("PHONEME IPA SERVICE TEST")
    print("=" * 80)

    preload()

    test_words = [
        "hello",
        "world",
        "apple",
        "beautiful",
        "read",
        "lead",
        "wind",
        "the",
        "butter",
    ]

    print("\n1. IPA without stress")
    print("-" * 50)

    for word in test_words:
        print(f"{word:12} -> {get_ipa_string(word)}")

    print("\n2. IPA with stress")
    print("-" * 50)

    for word in test_words:
        print(f"{word:12} -> {get_ipa_string_with_stress(word)}")

    print("\n3. Phoneme comparison")
    print("-" * 50)

    tests = [
        ("hello", "hello"),
        ("read", "red"),
        ("lead", "led"),
        ("butter", "butter"),
        ("butter", "budder"),
        ("sheep", "ship"),
        ("think", "sink"),
    ]

    for expected, actual in tests:
        score, diffs = compare_phonemes_with_ipa(expected, actual)
        issues = [
            item
            for item in diffs
            if item["type"] not in {"MATCH", "NO_DATA", "PUNCT", "STRESS_MATCH"}
        ]

        print(f"{expected:12} vs {actual:12} | score={score:.4f}")

        for issue in issues[:3]:
            print(
                f"  - {issue['type']}: "
                f"{issue.get('expected', '-')} -> {issue.get('actual', '-')}"
            )

    unload()

    print("\n" + "=" * 80)
    print("TEST COMPLETED")
    print("=" * 80)