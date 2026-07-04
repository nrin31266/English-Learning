# src/services/shadowing/shadowing_service.py

import os
from typing import Optional

from src.dto import (
    ShadowingRequest,
    ShadowingResult,
    ShadowingWord,
    ShadowingWordCompare,
)
from src.services.shadowing.phoneme_ipa_service import get_ipa_string_with_stress
from src.services.shadowing.phoneme_alignment_service import compare_words_with_ipa
from src.utils.text_normalizer import normalize_word_lower

RecToken = tuple[str, str]  # original, normalized
AlignedItem = tuple[Optional[str], Optional[str], Optional[str], Optional[str], str]

EXTRA_PENALTY_ALPHA = float(os.getenv("SHADOWING_EXTRA_PENALTY_ALPHA", "0.3"))


def _levenshtein_distance(a: str, b: str) -> int:
    if a == b:
        return 0

    if not a:
        return len(b)

    if not b:
        return len(a)

    rows = len(a) + 1
    cols = len(b) + 1

    dp = [[0] * cols for _ in range(rows)]

    for i in range(rows):
        dp[i][0] = i

    for j in range(cols):
        dp[0][j] = j

    for i in range(1, rows):
        for j in range(1, cols):
            cost = 0 if a[i - 1] == b[j - 1] else 1

            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )

    return dp[-1][-1]


def _word_substitution_cost(expected_norm: Optional[str], recognized_norm: str) -> float:
    if not expected_norm:
        return 1.0

    if expected_norm == recognized_norm:
        return 0.0

    distance = _levenshtein_distance(expected_norm, recognized_norm)
    max_len = max(len(expected_norm), len(recognized_norm))

    if max_len == 0:
        return 0.0

    similarity = 1.0 - distance / max_len

    return round(1.0 - similarity * 0.8, 4)


def _classify_word(
    expected_norm: Optional[str],
    recognized_norm: Optional[str],
) -> tuple[str, float]:
    if expected_norm and recognized_norm:
        if expected_norm == recognized_norm:
            return "CORRECT", 1.0

        distance = _levenshtein_distance(expected_norm, recognized_norm)
        max_len = max(len(expected_norm), len(recognized_norm))

        if distance == 1:
            if max_len <= 2:
                return "NEAR", 0.7

            if max_len <= 4:
                return "NEAR", 0.85

            if max_len <= 7:
                return "NEAR", 0.9

            return "NEAR", 0.85

        similarity = 1.0 - distance / max_len

        if similarity >= 0.8:
            return "NEAR", 0.7

        return "WRONG", 0.0

    if expected_norm and not recognized_norm:
        return "MISSING", 0.0

    if not expected_norm and recognized_norm:
        return "EXTRA", 0.0

    return "WRONG", 0.0


def _extract_recognized_tokens(transcription_result: dict) -> tuple[str, list[RecToken]]:
    recognized_text = transcription_result.get("text") or ""
    segments = transcription_result.get("segments") or []

    if not recognized_text:
        recognized_words = [
            word.get("word", "")
            for segment in segments
            for word in segment.get("words", [])
            if word.get("word")
        ]
        recognized_text = " ".join(recognized_words)

    tokens: list[RecToken] = []

    for raw_token in recognized_text.split():
        normalized = normalize_word_lower(raw_token)

        if normalized:
            tokens.append((raw_token, normalized))

    return recognized_text, tokens


def _extract_word_timestamps(transcription_result: dict) -> list[dict]:
    segments = transcription_result.get("segments") or []
    timestamps = []

    for segment in segments:
        for word in segment.get("words", []):
            if all(key in word for key in ("word", "start", "end")):
                timestamps.append(word)

    return timestamps


def _align_words(
    expected_words: list[ShadowingWord],
    expected_norms: list[Optional[str]],
    recognized_items: list[RecToken],
) -> list[AlignedItem]:
    expected_count = len(expected_norms)
    recognized_count = len(recognized_items)

    dp = [[0.0] * (recognized_count + 1) for _ in range(expected_count + 1)]

    for i in range(1, expected_count + 1):
        dp[i][0] = float(i)

    for j in range(1, recognized_count + 1):
        dp[0][j] = float(j)

    for i in range(1, expected_count + 1):
        for j in range(1, recognized_count + 1):
            cost = _word_substitution_cost(
                expected_norms[i - 1],
                recognized_items[j - 1][1],
            )

            dp[i][j] = min(
                dp[i - 1][j - 1] + cost,
                dp[i - 1][j] + 1.0,
                dp[i][j - 1] + 1.0,
            )

    aligned_reversed: list[AlignedItem] = []
    i = expected_count
    j = recognized_count
    epsilon = 1e-6

    while i > 0 or j > 0:
        if i > 0 and j > 0:
            recognized_raw, recognized_norm = recognized_items[j - 1]
            cost = _word_substitution_cost(expected_norms[i - 1], recognized_norm)

            if abs(dp[i][j] - (dp[i - 1][j - 1] + cost)) < epsilon:
                align_type = "MATCH" if cost == 0.0 else "SUBSTITUTE"

                aligned_reversed.append(
                    (
                        expected_words[i - 1].wordText,
                        expected_norms[i - 1] or "",
                        recognized_raw,
                        recognized_norm,
                        align_type,
                    )
                )

                i -= 1
                j -= 1
                continue

        if j > 0 and abs(dp[i][j] - (dp[i][j - 1] + 1.0)) < epsilon:
            recognized_raw, recognized_norm = recognized_items[j - 1]

            aligned_reversed.append(
                (
                    None,
                    None,
                    recognized_raw,
                    recognized_norm,
                    "INSERT",
                )
            )

            j -= 1
            continue

        if i > 0:
            aligned_reversed.append(
                (
                    expected_words[i - 1].wordText,
                    expected_norms[i - 1],
                    None,
                    None,
                    "DELETE",
                )
            )

            i -= 1

    aligned_reversed.reverse()

    return aligned_reversed


def _compute_fluency_score(word_timestamps: list[dict]) -> tuple[float, float, float]:
    if not word_timestamps:
        return 0.0, 0.0, 0.0

    words = sorted(word_timestamps, key=lambda item: item["start"])

    if len(words) == 1:
        duration = words[0]["end"] - words[0]["start"]
        speech_rate = 1.0 / duration if duration > 0 else 0.0

        return 1.0, 0.0, round(speech_rate, 4)

    pauses = [
        max(0.0, words[i]["start"] - words[i - 1]["end"])
        for i in range(1, len(words))
    ]

    avg_pause = sum(pauses) / len(pauses)

    duration = words[-1]["end"] - words[0]["start"]
    speech_rate = len(words) / duration if duration > 0 else 0.0

    pause_score = max(0.0, min(1.0, 1.0 - avg_pause / 1.2))

    target_rate = 2.5
    rate_score = max(
        0.0,
        min(1.0, 1.0 - abs(speech_rate - target_rate) / target_rate),
    )

    fluency_score = 0.55 * pause_score + 0.45 * rate_score

    return round(fluency_score, 4), round(avg_pause, 4), round(speech_rate, 4)


def _build_phoneme_diff(
    status: str,
    expected_word: Optional[str],
    recognized_word: Optional[str],
):
    expected_ipa = get_ipa_string_with_stress(expected_word) if expected_word else None
    actual_ipa = get_ipa_string_with_stress(recognized_word) if recognized_word else None

    return {
        "score": 1.0 if status == "CORRECT" else 0.0,
        "diff_tokens": [],
        "expected_ipa": expected_ipa if status != "EXTRA" else None,
        "actual_ipa": actual_ipa if status != "MISSING" else None,
    }


def _score_aligned_word(
    expected_word: Optional[str],
    expected_norm: Optional[str],
    recognized_word: Optional[str],
    recognized_norm: Optional[str],
    align_type: str,
) -> tuple[str, float, dict, bool]:
    if align_type == "INSERT":
        return (
            "EXTRA",
            0.0,
            _build_phoneme_diff("EXTRA", expected_word, recognized_word),
            True,
        )

    if align_type == "DELETE":
        return (
            "MISSING",
            0.0,
            _build_phoneme_diff("MISSING", expected_word, recognized_word),
            False,
        )

    status, score = _classify_word(expected_norm, recognized_norm)
    phoneme_diff = None

    if status in {"NEAR", "WRONG"} and expected_word and recognized_word:
        phoneme_score, diff_tokens, expected_ipa, actual_ipa = compare_words_with_ipa(
            expected_word,
            recognized_word,
        )

        phoneme_diff = {
            "score": phoneme_score,
            "diff_tokens": diff_tokens,
            "expected_ipa": expected_ipa or get_ipa_string_with_stress(expected_word),
            "actual_ipa": actual_ipa or get_ipa_string_with_stress(recognized_word),
        }

        if phoneme_score >= 0.9 and status != "CORRECT":
            status = "CORRECT"
            score = 1.0

        elif phoneme_score >= 0.75 and status == "WRONG":
            status = "NEAR"
            score = 0.7

    if phoneme_diff is None:
        phoneme_diff = _build_phoneme_diff(status, expected_word, recognized_word)

    return status, score, phoneme_diff, False


def build_shadowing_result(
    rq: ShadowingRequest,
    transcription_result: dict,
) -> ShadowingResult:
    expected_words = rq.expectedWords
    expected_norms = [normalize_word_lower(word.wordText) for word in expected_words]

    recognized_text, recognized_items = _extract_recognized_tokens(transcription_result)
    word_timestamps = _extract_word_timestamps(transcription_result)

    fluency_score, avg_pause, speech_rate = _compute_fluency_score(word_timestamps)

    aligned_items = _align_words(
        expected_words,
        expected_norms,
        recognized_items,
    )

    compares: list[ShadowingWordCompare] = []

    correct_count = 0
    total_score = 0.0
    extra_words = 0

    expected_position = -1
    last_recognized_position = -1

    for compare_position, (
        expected_word,
        expected_norm,
        recognized_word,
        recognized_norm,
        align_type,
    ) in enumerate(aligned_items):
        if expected_norm is not None:
            expected_position += 1

        if recognized_norm is not None and expected_norm is not None:
            last_recognized_position = expected_position

        status, score, phoneme_diff, is_extra = _score_aligned_word(
            expected_word,
            expected_norm,
            recognized_word,
            recognized_norm,
            align_type,
        )

        if is_extra:
            extra_words += 1

        if status == "CORRECT":
            correct_count += 1

        if expected_norm is not None:
            total_score += score

        compares.append(
            ShadowingWordCompare(
                position=compare_position,
                expectedWord=expected_word,
                recognizedWord=recognized_word,
                expectedNormalized=expected_norm,
                recognizedNormalized=recognized_norm,
                status=status,
                score=score,
                phonemeDiff=phoneme_diff,
            )
        )

    total_words = len(expected_norms)

    accuracy = (
        correct_count / total_words * 100.0
        if total_words > 0
        else 0.0
    )

    weighted_denominator = total_words + EXTRA_PENALTY_ALPHA * extra_words

    weighted_accuracy = (
        total_score / weighted_denominator * 100.0
        if weighted_denominator > 0
        else 0.0
    )

    return ShadowingResult(
        sentenceId=rq.sentenceId,
        expectedText=" ".join(word.wordText for word in expected_words),
        recognizedText=recognized_text,
        totalWords=total_words,
        correctWords=correct_count,
        accuracy=round(accuracy, 2),
        weightedAccuracy=round(weighted_accuracy, 2),
        fluencyScore=fluency_score,
        avgPause=avg_pause,
        speechRate=speech_rate,
        recognizedWordCount=len(recognized_items),
        lastRecognizedPosition=last_recognized_position,
        compares=compares,
    )