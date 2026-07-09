# src/services/shadowing/shadowing_service.py

from typing import Optional

from src.dto import (
    ShadowingRequest,
    ShadowingResult,
    ShadowingWord,
    ShadowingWordCompare,
)
from src.services.shadowing.phoneme_alignment_service import compare_texts_with_ipa
from src.services.shadowing.sequence_alignment import (
    align_sequences,
    levenshtein_distance,
    normalized_distance_cost,
    normalized_similarity,
)
from src.utils.text_normalizer import normalize_word_lower

RecToken = tuple[str, str]  # original, normalized
AlignedItem = tuple[Optional[str], Optional[str], Optional[str], Optional[str], str]


def _word_substitution_cost(expected_norm: Optional[str], recognized_norm: str) -> float:
    if not expected_norm:
        return 1.0

    return normalized_distance_cost(expected_norm, recognized_norm)


def _classify_word_status(
    expected_norm: Optional[str],
    recognized_norm: Optional[str],
) -> str:
    if expected_norm and recognized_norm:
        if expected_norm == recognized_norm:
            return "CORRECT"

        distance = levenshtein_distance(expected_norm, recognized_norm)
        max_len = max(len(expected_norm), len(recognized_norm))

        if distance == 1:
            if max_len <= 2:
                return "NEAR"

            if max_len <= 4:
                return "NEAR"

            if max_len <= 7:
                return "NEAR"

            return "NEAR"

        similarity = normalized_similarity(expected_norm, recognized_norm)

        if similarity >= 0.8:
            return "NEAR"

        return "WRONG"

    if expected_norm and not recognized_norm:
        return "MISSING"

    if not expected_norm and recognized_norm:
        return "EXTRA"

    return "WRONG"


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
    expected_items = list(zip(expected_words, expected_norms))

    aligned_pairs = align_sequences(
        expected_items,
        recognized_items,
        lambda expected_item, recognized_item: _word_substitution_cost(
            expected_item[1],
            recognized_item[1],
        ),
    )

    return [
        (
            expected_item[0].wordText if expected_item else None,
            expected_item[1] if expected_item else None,
            recognized_item[0] if recognized_item else None,
            recognized_item[1] if recognized_item else None,
            align_type,
        )
        for expected_item, recognized_item, align_type in aligned_pairs
    ]


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


def _get_aligned_word_status(
    expected_norm: Optional[str],
    recognized_norm: Optional[str],
    align_type: str,
) -> str:
    if align_type == "INSERT":
        return "EXTRA"

    if align_type == "DELETE":
        return "MISSING"

    return _classify_word_status(expected_norm, recognized_norm)


def build_shadowing_result(
    rq: ShadowingRequest,
    transcription_result: dict,
) -> ShadowingResult:
    expected_words = rq.expectedWords
    expected_text = " ".join(word.wordText for word in expected_words)
    expected_norms = [normalize_word_lower(word.wordText) for word in expected_words]

    recognized_text, recognized_items = _extract_recognized_tokens(transcription_result)
    word_timestamps = _extract_word_timestamps(transcription_result)
    (
        sentence_phoneme_score,
        sentence_diff_tokens,
        expected_sentence_ipa,
        actual_sentence_ipa,
    ) = compare_texts_with_ipa(expected_text, recognized_text)

    fluency_score, avg_pause, speech_rate = _compute_fluency_score(word_timestamps)

    aligned_items = _align_words(
        expected_words,
        expected_norms,
        recognized_items,
    )

    compares: list[ShadowingWordCompare] = []

    correct_count = 0

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

        status = _get_aligned_word_status(
            expected_norm,
            recognized_norm,
            align_type,
        )

        if status == "CORRECT":
            correct_count += 1

        compares.append(
            ShadowingWordCompare(
                position=compare_position,
                expectedWord=expected_word,
                recognizedWord=recognized_word,
                expectedNormalized=expected_norm,
                recognizedNormalized=recognized_norm,
                status=status,
            )
        )

    total_words = len(expected_norms)
    sentence_accuracy = round(sentence_phoneme_score * 100.0, 2)

    return ShadowingResult(
        sentenceId=rq.sentenceId,
        expectedText=expected_text,
        recognizedText=recognized_text,
        totalWords=total_words,
        correctWords=correct_count,
        accuracy=sentence_accuracy,
        weightedAccuracy=sentence_accuracy,
        fluencyScore=fluency_score,
        avgPause=avg_pause,
        speechRate=speech_rate,
        recognizedWordCount=len(recognized_items),
        lastRecognizedPosition=last_recognized_position,
        compares=compares,
        phoneme_diff={
            "score": sentence_phoneme_score,
            "diff_tokens": sentence_diff_tokens,
            "expected_ipa": expected_sentence_ipa,
            "actual_ipa": actual_sentence_ipa,
        },
    )
