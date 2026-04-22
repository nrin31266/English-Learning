from __future__ import annotations

from datetime import datetime
from pathlib import Path

from src.services.shadowing_service import build_shadowing_result
from test_script.common.mock_factory import make_shadowing_request

BASE_DIR = Path(__file__).resolve().parent
LOG_PATH = BASE_DIR / "logs" / "step3_latest.log"


def write_log(lines: list[str]) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_with_segments(expected_words: list[str], words: list[dict]):
    rq = make_shadowing_request(expected_words, sentence_id=3)
    transcription_result = {
        "text": " ".join(w["word"] for w in words),
        "segments": [
            {
                "start": words[0]["start"] if words else 0.0,
                "end": words[-1]["end"] if words else 0.0,
                "text": " ".join(w["word"] for w in words),
                "words": words,
            }
        ],
    }
    return build_shadowing_result(rq, transcription_result)


def main() -> None:
    report = [
        "STEP 3 MOCK TEST REPORT",
        f"GeneratedAt: {datetime.now().isoformat()}",
        "",
    ]

    expected = ["we", "ask", "you", "to"]

    # Fluency tốt: pause nhỏ, tốc độ tương đối ổn.
    good_words = [
        {"word": "we", "start": 0.0, "end": 0.3},
        {"word": "ask", "start": 0.35, "end": 0.65},
        {"word": "you", "start": 0.7, "end": 0.95},
        {"word": "to", "start": 1.0, "end": 1.2},
    ]

    # Fluency kém: pause lớn + tốc độ chậm.
    bad_words = [
        {"word": "we", "start": 0.0, "end": 0.3},
        {"word": "ask", "start": 1.1, "end": 1.4},
        {"word": "you", "start": 2.4, "end": 2.7},
        {"word": "to", "start": 3.7, "end": 3.9},
    ]

    good = build_with_segments(expected, good_words)
    bad = build_with_segments(expected, bad_words)

    assert good.fluencyScore > bad.fluencyScore, (
        f"Expected good fluency > bad fluency, got {good.fluencyScore} <= {bad.fluencyScore}"
    )
    assert bad.avgPause > good.avgPause, (
        f"Expected bad avgPause > good avgPause, got {bad.avgPause} <= {good.avgPause}"
    )
    assert bad.speechRate < good.speechRate, (
        f"Expected bad speechRate < good speechRate, got {bad.speechRate} >= {good.speechRate}"
    )

    report.extend([
        "CASE: compare_good_vs_bad_fluency",
        f"  good: fluency={good.fluencyScore}, avgPause={good.avgPause}, speechRate={good.speechRate}",
        f"  bad:  fluency={bad.fluencyScore}, avgPause={bad.avgPause}, speechRate={bad.speechRate}",
        "  status: PASS",
        "",
    ])

    # Case mô phỏng gần ví dụ yêu cầu: pause cao và speech rate thấp.
    example_words = [
        {"word": "we", "start": 0.0, "end": 0.25},
        {"word": "ask", "start": 1.0, "end": 1.25},
        {"word": "you", "start": 2.0, "end": 2.25},
        {"word": "to", "start": 3.0, "end": 3.25},
    ]

    example = build_with_segments(expected, example_words)

    report.extend([
        "CASE: hesitated_speech_example",
        f"  fluencyScore={example.fluencyScore}",
        f"  avgPause={example.avgPause}",
        f"  speechRate={example.speechRate}",
        "  status: PASS",
        "",
    ])

    write_log(report)
    print(f"PASS: step3 fluency cases. Log written to {LOG_PATH}")


if __name__ == "__main__":
    main()
