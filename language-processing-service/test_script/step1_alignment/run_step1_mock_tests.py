from __future__ import annotations

from datetime import datetime
from pathlib import Path

from src.dto import ShadowingRequest, ShadowingWord
from src.services.shadowing_service import build_shadowing_result
from test_script.common.mock_factory import run_mock_shadowing, serialize_compares


BASE_DIR = Path(__file__).resolve().parent
LOG_PATH = BASE_DIR / "logs" / "step1_latest.log"

Case = tuple[str, list[str], str, list[tuple[str | None, str | None, str]]]


CASES: list[Case] = [
    (
        "exact_match",
        ["I", "like", "apples"],
        "I like apples",
        [
            ("I", "I", "CORRECT"),
            ("like", "like", "CORRECT"),
            ("apples", "apples", "CORRECT"),
        ],
    ),
    (
        "insert_extra_word",
        ["I", "like", "apples"],
        "I really like apples",
        [
            ("I", "I", "CORRECT"),
            (None, "really", "EXTRA"),
            ("like", "like", "CORRECT"),
            ("apples", "apples", "CORRECT"),
        ],
    ),
    (
        "insert_extra_at_start",
        ["I", "like", "apples"],
        "well I like apples",
        [
            (None, "well", "EXTRA"),
            ("I", "I", "CORRECT"),
            ("like", "like", "CORRECT"),
            ("apples", "apples", "CORRECT"),
        ],
    ),
    (
        "insert_extra_at_end",
        ["I", "like", "apples"],
        "I like apples today",
        [
            ("I", "I", "CORRECT"),
            ("like", "like", "CORRECT"),
            ("apples", "apples", "CORRECT"),
            (None, "today", "EXTRA"),
        ],
    ),
    (
        "delete_missing_word",
        ["I", "really", "like", "apples"],
        "I like apples",
        [
            ("I", "I", "CORRECT"),
            ("really", None, "MISSING"),
            ("like", "like", "CORRECT"),
            ("apples", "apples", "CORRECT"),
        ],
    ),
    (
        "delete_missing_at_end",
        ["I", "like", "green", "apples"],
        "I like green",
        [
            ("I", "I", "CORRECT"),
            ("like", "like", "CORRECT"),
            ("green", "green", "CORRECT"),
            ("apples", None, "MISSING"),
        ],
    ),
    (
        "substitute_near_word",
        ["I", "like", "apples"],
        "I like apple",
        [
            ("I", "I", "CORRECT"),
            ("like", "like", "CORRECT"),
            ("apples", "apple", "NEAR"),
        ],
    ),
    (
        "substitute_wrong_word",
        ["I", "like", "apples"],
        "I like bananas",
        [
            ("I", "I", "CORRECT"),
            ("like", "like", "CORRECT"),
            ("apples", "bananas", "WRONG"),
        ],
    ),
    (
        "insert_middle_and_end",
        ["I", "like", "apples"],
        "I really like apples today",
        [
            ("I", "I", "CORRECT"),
            (None, "really", "EXTRA"),
            ("like", "like", "CORRECT"),
            ("apples", "apples", "CORRECT"),
            (None, "today", "EXTRA"),
        ],
    ),
    (
        "all_wrong_same_length",
        ["cat", "dog", "bird"],
        "sun moon star",
        [
            ("cat", "sun", "WRONG"),
            ("dog", "moon", "WRONG"),
            ("bird", "star", "WRONG"),
        ],
    ),
    (
        "contraction_normalization",
        ["It's", "fine"],
        "its fine",
        [
            ("It's", "its", "CORRECT"),
            ("fine", "fine", "CORRECT"),
        ],
    ),
    (
        "punctuation_normalization",
        ["Hello", "world"],
        "Hello, world!",
        [
            ("Hello", "Hello,", "CORRECT"),
            ("world", "world!", "CORRECT"),
        ],
    ),
]


def write_log(lines: list[str]) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_case(name: str, expected_words: list[str], recognized_text: str, expected_compares: list[tuple[str | None, str | None, str]]) -> list[str]:
    result = run_mock_shadowing(words=expected_words, recognized_text=recognized_text)
    actual = serialize_compares(result)

    case_lines = [
        f"CASE: {name}",
        f"  expected_words: {expected_words}",
        f"  recognized_text: {recognized_text}",
        f"  weightedAccuracy: {result.weightedAccuracy}",
        "  compares:",
    ]

    for row in actual:
        case_lines.append(f"    - {row[0]} | {row[1]} | {row[2]}")

    assert actual == expected_compares, (
        f"Case '{name}' failed.\nExpected: {expected_compares}\nActual: {actual}"
    )

    case_lines.append("  status: PASS")
    case_lines.append("")
    return case_lines


def run_case_raw_expected_norm(
    name: str,
    words_with_norm: list[tuple[str, str]],
    recognized_text: str,
    expected_compares: list[tuple[str | None, str | None, str]],
) -> list[str]:
    expected_words = [
        ShadowingWord(
            id=idx + 1,
            wordText=word_text,
            wordLower=word_text.lower(),
            wordNormalized=raw_norm,
            wordSlug=raw_norm,
            orderIndex=idx,
        )
        for idx, (word_text, raw_norm) in enumerate(words_with_norm)
    ]

    rq = ShadowingRequest(sentenceId=999, expectedWords=expected_words)
    result = build_shadowing_result(rq, {"text": recognized_text, "segments": []})
    actual = serialize_compares(result)

    case_lines = [
        f"CASE: {name}",
        f"  words_with_norm: {words_with_norm}",
        f"  recognized_text: {recognized_text}",
        f"  weightedAccuracy: {result.weightedAccuracy}",
        "  compares:",
    ]

    for row in actual:
        case_lines.append(f"    - {row[0]} | {row[1]} | {row[2]}")

    assert actual == expected_compares, (
        f"Case '{name}' failed.\nExpected: {expected_compares}\nActual: {actual}"
    )

    case_lines.append("  status: PASS")
    case_lines.append("")
    return case_lines


def main() -> None:
    report = [
        "STEP 1 MOCK TEST REPORT",
        f"GeneratedAt: {datetime.now().isoformat()}",
        "",
    ]

    for name, expected_words, recognized_text, expected_compares in CASES:
        report.extend(
            run_case(
                name=name,
                expected_words=expected_words,
                recognized_text=recognized_text,
                expected_compares=expected_compares,
            )
        )

    report.extend(
        run_case_raw_expected_norm(
            name="payload_apostrophe_norm_regression",
            words_with_norm=[("let's", "let's")],
            recognized_text="lets",
            expected_compares=[
                ("let's", "lets", "CORRECT"),
            ],
        )
    )

    write_log(report)
    print(f"PASS: all step1 cases. Log written to {LOG_PATH}")


if __name__ == "__main__":
    main()
