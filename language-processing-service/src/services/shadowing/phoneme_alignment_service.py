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
from src.services.shadowing.sequence_alignment import (
    align_sequences,
    get_phoneme_cost,
    levenshtein_alignment_with_similarity,
)

Token = dict[str, Any]
DiffToken = dict[str, Any]
PhonemeRef = dict[str, Any]

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

SENTENCE_GAP_COST = 0.45
EXTRA_WEIGHT = 0.75
SCORE_PENALTIES = {
    "MATCH": 0.0,
    "STRESS_MATCH": 0.0,
    "PUNCT": 0.0,
    "SPACE": 0.0,
    "MISMATCH": 0.75,
    "MISSING": 1.0,
    "EXTRA": 0.75,
    "STRESS_WRONG": 0.15,
}


def _token_type(token: str) -> str:
    if token.isspace():
        return "SPACE"

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

        tokens.append(
            {
                "value": " " if char.isspace() else char,
                "type": _token_type(char),
            }
        )

        index += 1

    return tokens


def _phonemes_only(tokens: list[Token]) -> list[str]:
    return [token["value"] for token in tokens if token["type"] == "PHONEME"]


def _phoneme_refs(tokens: list[Token]) -> list[PhonemeRef]:
    return [
        {
            "value": token["value"],
            "token_index": index,
        }
        for index, token in enumerate(tokens)
        if token["type"] == "PHONEME"
    ]


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


def _append_space_diff(diff_tokens: list[DiffToken]) -> None:
    if not diff_tokens or diff_tokens[-1]["type"] == "SPACE":
        return

    diff_tokens.append(_new_diff("SPACE", " ", " ", None))


def _trim_trailing_space(diff_tokens: list[DiffToken]) -> None:
    while diff_tokens and diff_tokens[-1]["type"] == "SPACE":
        diff_tokens.pop()


def _has_token_type(tokens: list[Token], start: int, end: int, token_type: str) -> bool:
    return any(token["type"] == token_type for token in tokens[start:end])


def _find_token_type(
    tokens: list[Token],
    start: int,
    end: int,
    token_type: str,
) -> Token | None:
    for token in tokens[start:end]:
        if token["type"] == token_type:
            return token

    return None


def _append_stress_diff(
    diff_tokens: list[DiffToken],
    expected_token: Token,
    actual_token: Token | None,
    position: int,
) -> int:
    diff_type = (
        "STRESS_MATCH"
        if actual_token and expected_token["value"] == actual_token["value"]
        else "STRESS_WRONG"
    )

    diff_tokens.append(
        _new_diff(
            diff_type,
            expected_token["value"],
            actual_token["value"] if actual_token else None,
            position,
        )
    )

    return position + 1


def _append_meta_diff(
    diff_tokens: list[DiffToken],
    expected_token: Token | None,
    actual_token: Token | None,
    position: int,
) -> int:
    """
    Add space/stress/punctuation diff tokens.

    Stress is meaningful for pronunciation scoring.
    Space and punctuation are kept only for display/context.
    Extra actual metadata is ignored because it usually comes from model noise.
    """
    expected_type = expected_token["type"] if expected_token else None
    actual_type = actual_token["type"] if actual_token else None

    if expected_type == "SPACE" or actual_type == "SPACE":
        _append_space_diff(diff_tokens)
        return position

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

    if expected_type == "PUNCT":
        diff_tokens.append(
            _new_diff(
                "PUNCT",
                expected_token["value"],
                actual_token["value"] if actual_type == "PUNCT" else None,
                position,
            )
        )

        return position

    return position


def _emit_expected_meta_until(
    expected_tokens: list[Token],
    actual_tokens: list[Token],
    expected_cursor: int,
    actual_cursor: int,
    expected_target: int,
    actual_target: int | None,
    position: int,
    diff_tokens: list[DiffToken],
) -> tuple[int, int]:
    actual_meta_end = actual_target if actual_target is not None else actual_cursor

    while expected_cursor < expected_target:
        expected_token = expected_tokens[expected_cursor]
        expected_type = expected_token["type"]

        if expected_type == "SPACE":
            _append_space_diff(diff_tokens)

        elif expected_type == "PUNCT":
            actual_punct = _find_token_type(
                actual_tokens,
                actual_cursor,
                actual_meta_end,
                "PUNCT",
            )
            diff_tokens.append(
                _new_diff(
                    "PUNCT",
                    expected_token["value"],
                    actual_punct["value"] if actual_punct else None,
                    position,
                )
            )

        elif expected_type == "STRESS":
            actual_stress = _find_token_type(
                actual_tokens,
                actual_cursor,
                actual_meta_end,
                "STRESS",
            )
            position = _append_stress_diff(
                diff_tokens,
                expected_token,
                actual_stress,
                position,
            )

        expected_cursor += 1

    return expected_cursor, position


def _consume_actual_meta_before_extra(
    expected_tokens: list[Token],
    actual_tokens: list[Token],
    expected_cursor: int,
    actual_cursor: int,
    actual_target: int,
    diff_tokens: list[DiffToken],
) -> tuple[int, int]:
    while actual_cursor < actual_target:
        actual_token = actual_tokens[actual_cursor]

        if actual_token["type"] == "SPACE":
            if (
                expected_cursor < len(expected_tokens)
                and expected_tokens[expected_cursor]["type"] == "SPACE"
            ):
                _append_space_diff(diff_tokens)
                expected_cursor += 1
            elif diff_tokens and diff_tokens[-1]["type"] == "EXTRA":
                _append_space_diff(diff_tokens)

        actual_cursor += 1

    return expected_cursor, actual_cursor


def _append_phoneme_diff(
    diff_tokens: list[DiffToken],
    expected_ref: PhonemeRef | None,
    actual_ref: PhonemeRef | None,
    position: int,
) -> int:
    expected_value = expected_ref["value"] if expected_ref else None
    actual_value = actual_ref["value"] if actual_ref else None

    diff_tokens.append(
        _new_diff(
            _diff_type(expected_value, actual_value),
            expected_value,
            actual_value,
            position,
        )
    )

    return position + 1


def _score_sentence_diff(
    diff_tokens: list[DiffToken],
    expected_phoneme_count: int,
) -> float:
    extra_count = sum(1 for token in diff_tokens if token["type"] == "EXTRA")
    denominator = expected_phoneme_count + EXTRA_WEIGHT * extra_count

    if denominator <= 0:
        return 0.0

    penalty = sum(
        SCORE_PENALTIES.get(token["type"], 0.0)
        for token in diff_tokens
    )

    return round(max(0.0, 1.0 - penalty / denominator), 4)


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

        if (
            actual_token
            and actual_token["type"] == "SPACE"
            and not expected_meta
            and expected_index < len(expected_tokens)
            and expected_tokens[expected_index]["type"] == "PHONEME"
        ):
            actual_index += 1
            continue

        pair_tokens = (
            expected_token is not None
            and actual_token is not None
            and expected_token["type"] == actual_token["type"]
        )

        if expected_token and actual_token and not pair_tokens:
            if expected_token["type"] in {"SPACE", "PUNCT"}:
                actual_token = None
            elif actual_token["type"] in {"SPACE", "PUNCT"}:
                expected_token = None

        position = _append_meta_diff(diff_tokens, expected_token, actual_token, position)

        if expected_token is not None:
            expected_index += 1

        if actual_token is not None:
            actual_index += 1

        # Actual-only metadata is consumed unless it is emitted above for context.

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


def compare_sentence_phonemes_with_alignment(
    expected_tokens: list[Token],
    actual_tokens: list[Token],
) -> tuple[float, list[DiffToken]]:
    expected_refs = _phoneme_refs(expected_tokens)
    actual_refs = _phoneme_refs(actual_tokens)

    if not expected_refs or not actual_refs:
        return 0.0, [
            _new_diff(
                "NO_DATA",
                None,
                None,
                None,
            )
        ]

    aligned_pairs = align_sequences(
        expected_refs,
        actual_refs,
        lambda expected_ref, actual_ref: get_phoneme_cost(
            expected_ref["value"],
            actual_ref["value"],
        ),
        delete_cost=SENTENCE_GAP_COST,
        insert_cost=SENTENCE_GAP_COST,
        prefer_gap_on_tie=True,
    )

    diff_tokens: list[DiffToken] = []
    expected_cursor = 0
    actual_cursor = 0
    position = 0

    for expected_ref, actual_ref, _ in aligned_pairs:
        if expected_ref is None and actual_ref is not None:
            actual_target = actual_ref["token_index"]
            expected_cursor, actual_cursor = _consume_actual_meta_before_extra(
                expected_tokens,
                actual_tokens,
                expected_cursor,
                actual_cursor,
                actual_target,
                diff_tokens,
            )
            position = _append_phoneme_diff(
                diff_tokens,
                None,
                actual_ref,
                position,
            )
            actual_cursor = actual_target + 1
            continue

        if expected_ref is None:
            continue

        expected_target = expected_ref["token_index"]
        actual_target = actual_ref["token_index"] if actual_ref else None

        if (
            actual_target is not None
            and expected_cursor == expected_target
            and diff_tokens
            and diff_tokens[-1]["type"] == "EXTRA"
            and _has_token_type(actual_tokens, actual_cursor, actual_target, "SPACE")
        ):
            _append_space_diff(diff_tokens)

        expected_cursor, position = _emit_expected_meta_until(
            expected_tokens,
            actual_tokens,
            expected_cursor,
            actual_cursor,
            expected_target,
            actual_target,
            position,
            diff_tokens,
        )

        position = _append_phoneme_diff(
            diff_tokens,
            expected_ref,
            actual_ref,
            position,
        )

        expected_cursor = expected_target + 1

        if actual_target is not None:
            actual_cursor = actual_target + 1

    expected_cursor, position = _emit_expected_meta_until(
        expected_tokens,
        actual_tokens,
        expected_cursor,
        actual_cursor,
        len(expected_tokens),
        None,
        position,
        diff_tokens,
    )

    _trim_trailing_space(diff_tokens)

    score = _score_sentence_diff(diff_tokens, len(expected_refs))

    return score, diff_tokens


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


def compare_texts_with_ipa(
    expected_text: str,
    actual_text: str,
    keep_stress: bool = True,
) -> tuple[float, list[DiffToken], str, str]:
    expected_ipa = get_ipa(
        expected_text,
        keep_stress=keep_stress,
        normalize=True,
        remove_length=False,
        remove_punctuation=False,
        as_string=True,
    ) or ""

    actual_ipa = get_ipa(
        actual_text,
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

    score, diff_tokens = compare_sentence_phonemes_with_alignment(
        expected_tokens,
        actual_tokens,
    )

    return score, _add_ipa_fields(diff_tokens), expected_ipa, actual_ipa


if __name__ == "__main__":
    def _display_from_diff_tokens(diff_tokens: list[DiffToken]) -> str:
        return "".join(
            token.get("expected_ipa")
            or token.get("expected")
            or token.get("actual_ipa")
            or token.get("actual")
            or ""
            for token in diff_tokens
            if token["type"] != "EXTRA"
        )

    def _print_sentence_case(title: str, expected: str, actual: str) -> None:
        score, diffs, expected_ipa, actual_ipa = compare_texts_with_ipa(
            expected,
            actual,
        )
        display = _display_from_diff_tokens(diffs)

        print(f"\n{title}")
        print("-" * 50)
        print(f"score={score:.4f}")
        print(f"EXP: /{expected_ipa}/")
        print(f"ACT: /{actual_ipa}/")
        print(f"DSP: /{display}/")

        issues = [
            diff
            for diff in diffs
            if diff["type"] in {"MISMATCH", "MISSING", "EXTRA", "STRESS_WRONG"}
        ]

        for issue in issues[:16]:
            print(
                f"  - {issue['type']}: "
                f"{issue.get('expected')} -> {issue.get('actual')}"
            )

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
        ("it's", "it"),
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
                if diff["type"] not in {"MATCH", "PUNCT", "SPACE", "STRESS_MATCH"}
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

    _print_sentence_case(
        "SENTENCE SPACE REGRESSION",
        "By 8 o'clock, it's time to get to work.",
        "By 8 o'clock it time to get to work.",
    )
    print("Expected around missing contraction: ɪts tˈaɪm")
    print("Should not contain: ɪt s tˈaɪm")

    _print_sentence_case(
        "EXTRA ENDING REGRESSION",
        "I work from home.",
        "I worked from home.",
    )

    _print_sentence_case(
        "EXTRA WORD REGRESSION",
        "I work from home.",
        "I really work from home.",
    )

    _print_sentence_case(
        "LONG WRONG REGRESSION",
        (
            "I work from home, so I head to my home office, "
            "a cozy room filled with natural light and plants."
        ),
        (
            "I worked from home, so I had to my home office cause the ground "
            "field with natural eyes and flies."
        ),
    )

    print("=" * 80)
    print("TEST COMPLETED")
