from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from test_script.common.mock_factory import run_mock_shadowing

BASE_DIR = Path(__file__).resolve().parent
LOG_PATH = BASE_DIR / "logs" / "step2_latest.log"
ALPHA_ENV = "SHADOWING_EXTRA_PENALTY_ALPHA"


def write_log(lines: list[str]) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_with_alpha(expected_words: list[str], recognized_text: str, alpha: float):
    old_alpha = os.environ.get(ALPHA_ENV)
    try:
        os.environ[ALPHA_ENV] = str(alpha)
        return run_mock_shadowing(words=expected_words, recognized_text=recognized_text)
    finally:
        if old_alpha is None:
            os.environ.pop(ALPHA_ENV, None)
        else:
            os.environ[ALPHA_ENV] = old_alpha


def assert_close(actual: float, expected: float, eps: float = 0.02) -> None:
    assert abs(actual - expected) <= eps, f"Expected {expected}, got {actual}"


def main() -> None:
    report = [
        "STEP 2 MOCK TEST REPORT",
        f"GeneratedAt: {datetime.now().isoformat()}",
        "",
    ]

    # Case 1: không có EXTRA -> weighted không đổi dù alpha>0.
    expected = ["I", "like", "apples"]
    recognized_no_extra = "I like apples"
    r_no_extra_alpha0 = run_with_alpha(expected, recognized_no_extra, 0.0)
    r_no_extra_alpha03 = run_with_alpha(expected, recognized_no_extra, 0.3)

    assert_close(r_no_extra_alpha0.weightedAccuracy, 100.0)
    assert_close(r_no_extra_alpha03.weightedAccuracy, 100.0)

    report.extend([
        "CASE: no_extra_same_result",
        f"  weighted(alpha=0.0): {r_no_extra_alpha0.weightedAccuracy}",
        f"  weighted(alpha=0.3): {r_no_extra_alpha03.weightedAccuracy}",
        "  status: PASS",
        "",
    ])

    # Case 2: 1 EXTRA -> weighted giảm khi alpha=0.3.
    recognized_one_extra = "I really like apples"
    r_one_extra_alpha0 = run_with_alpha(expected, recognized_one_extra, 0.0)
    r_one_extra_alpha03 = run_with_alpha(expected, recognized_one_extra, 0.3)

    assert_close(r_one_extra_alpha0.weightedAccuracy, 100.0)
    assert_close(r_one_extra_alpha03.weightedAccuracy, 90.91)
    assert r_one_extra_alpha03.weightedAccuracy < r_one_extra_alpha0.weightedAccuracy

    report.extend([
        "CASE: one_extra_penalized",
        f"  weighted(alpha=0.0): {r_one_extra_alpha0.weightedAccuracy}",
        f"  weighted(alpha=0.3): {r_one_extra_alpha03.weightedAccuracy}",
        "  status: PASS",
        "",
    ])

    # Case 3: 2 EXTRA -> weighted giảm mạnh hơn.
    recognized_two_extra = "I really really like apples"
    r_two_extra_alpha0 = run_with_alpha(expected, recognized_two_extra, 0.0)
    r_two_extra_alpha03 = run_with_alpha(expected, recognized_two_extra, 0.3)

    assert_close(r_two_extra_alpha0.weightedAccuracy, 100.0)
    assert_close(r_two_extra_alpha03.weightedAccuracy, 83.33)
    assert r_two_extra_alpha03.weightedAccuracy < 85.0

    report.extend([
        "CASE: two_extra_penalized_more",
        f"  weighted(alpha=0.0): {r_two_extra_alpha0.weightedAccuracy}",
        f"  weighted(alpha=0.3): {r_two_extra_alpha03.weightedAccuracy}",
        "  status: PASS",
        "",
    ])

    write_log(report)
    print(f"PASS: step2 penalty cases. Log written to {LOG_PATH}")


if __name__ == "__main__":
    main()
