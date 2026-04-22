# test_script/common/mock_factory.py
from __future__ import annotations

from typing import Iterable

from src.dto import ShadowingRequest, ShadowingWord
from src.services.file_service import normalize_word_lower
from src.services.shadowing_service import build_shadowing_result


def make_shadowing_request(words: Iterable[str], sentence_id: int = 1) -> ShadowingRequest:
    expected_words: list[ShadowingWord] = []
    for idx, word in enumerate(words):
        normalized = normalize_word_lower(word) or word.lower()
        lowered = word.lower()
        expected_words.append(
            ShadowingWord(
                id=idx + 1,
                wordText=word,
                wordLower=lowered,
                wordNormalized=normalized,
                wordSlug=normalized,
                orderIndex=idx,
            )
        )

    return ShadowingRequest(sentenceId=sentence_id, expectedWords=expected_words)




# Trong mock_factory.py
def make_transcription_result_with_mock_timestamps(text: str, duration: float = 10.0) -> dict:
    """Tạo transcription_result có mock timestamps để test fluency"""
    words = text.split()
    word_duration = duration / len(words) if words else 0.1
    
    segments = [{
        "start": 0,
        "end": duration,
        "text": text,
        "words": [
            {
                "word": w,
                "start": i * word_duration,
                "end": (i + 1) * word_duration,
                "score": 0.95
            }
            for i, w in enumerate(words)
        ]
    }]
    
    return {"text": text, "segments": segments}


def run_mock_shadowing(words: Iterable[str], recognized_text: str, sentence_id: int = 1):
    rq = make_shadowing_request(words=words, sentence_id=sentence_id)
    transcription_result = make_transcription_result_with_mock_timestamps(recognized_text)
    return build_shadowing_result(rq, transcription_result)


def serialize_compares(result) -> list[tuple[str | None, str | None, str]]:
    return [
        (c.expectedWord, c.recognizedWord, c.status)
        for c in result.compares
    ]
