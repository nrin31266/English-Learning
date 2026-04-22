from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from src.services.shadowing_service import get_pronunciation_score

BASE_DIR = Path(__file__).resolve().parent
LOG_PATH = BASE_DIR / "logs" / "step4_latest.log"
CASES_PATH = BASE_DIR / "mock_pronunciation_cases.json"
EPSILON = 0.001


def write_log(lines: list[str]) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _load_cases() -> list[dict]:
    data = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise AssertionError("mock_pronunciation_cases.json must be a JSON array")
    return data


def main() -> None:
    cases = _load_cases()
    assert len(cases) >= 8, f"Expected at least 8 cases, got {len(cases)}"

    report = [
        "STEP 4 MOCK TEST REPORT",
        f"GeneratedAt: {datetime.now().isoformat()}",
        f"CaseFile: {CASES_PATH}",
        f"TotalCases: {len(cases)}",
        "",
    ]

    for idx, case in enumerate(cases, start=1):
        case_id = case.get("id", f"case_{idx}")
        input_obj = case.get("input") or {}
        output_obj = case.get("output") or {}
        expected_word = input_obj.get("expectedWord")
        recognized_word = input_obj.get("recognizedWord")
        expected_score = output_obj.get("expectedPhonemeScore")
        explanation = case.get("explanation", "")

        assert isinstance(expected_word, str) and expected_word, f"{case_id}: invalid expectedWord"
        assert isinstance(recognized_word, str) and recognized_word, f"{case_id}: invalid recognizedWord"
        assert isinstance(expected_score, (float, int)), f"{case_id}: invalid expectedPhonemeScore"

        actual_score = get_pronunciation_score(expected_word, recognized_word)
        assert 0.0 <= actual_score <= 1.0, f"{case_id}: score out of range [0,1], got {actual_score}"
        assert abs(actual_score - float(expected_score)) <= EPSILON, (
            f"{case_id}: expected {expected_score}, got {actual_score}"
        )

        report.extend([
            f"CASE {idx}: {case_id}",
            f"  input=({expected_word} -> {recognized_word})",
            f"  expected={float(expected_score):.4f}",
            f"  actual={actual_score:.4f}",
            f"  explanation={explanation}",
            "  status: PASS",
            "",
        ])

    write_log(report)
    print(f"PASS: step4 phoneme json cases ({len(cases)}). Log written to {LOG_PATH}")


if __name__ == "__main__":
    main()
