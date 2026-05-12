import logging
import os
from typing import List, Tuple, Dict, Any

from src.services.phoneme_ipa_service import (
    compare_phonemes_with_ipa, 
    get_ipa_string_with_stress, 
    compare_words_with_ipa
)
from src.dto import ShadowingResult, ShadowingWordCompare, ShadowingRequest, ShadowingWord
from src.utils.text_normalizer import normalize_word_lower

# Types for clarity
RecToken = Tuple[str, str]  # (original, normalized)
AlignedItem = Tuple[str | None, str | None, str | None, str | None, str]

# Configuration Constants
DEFAULT_EXTRA_PENALTY_ALPHA = 0.3
EXTRA_PENALTY_ALPHA_ENV = "SHADOWING_EXTRA_PENALTY_ALPHA"

logger = logging.getLogger(__name__)

def _levenshtein_distance(a: str, b: str) -> int:
    """Standard Levenshtein distance for short strings."""
    if a == b: return 0
    if not a: return len(b)
    if not b: return len(a)

    la, lb = len(a), len(b)
    dp = [[0] * (lb + 1) for _ in range(la + 1)]

    for i in range(la + 1): dp[i][0] = i
    for j in range(lb + 1): dp[0][j] = j

    for i in range(1, la + 1):
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,      # deletion
                dp[i][j - 1] + 1,      # insertion
                dp[i - 1][j - 1] + cost # substitution
            )
    return dp[la][lb]

def _word_sub_cost(exp_norm: str | None, rec_norm: str) -> float:
    """
    Similarity-based substitution cost for word alignment.
    Range: 0.0 (exact match) → 1.0 (completely different).
    Similar words (e.g. 'want' vs 'wanna') get low cost so the DP
    prefers pairing them over pairing unrelated words.
    """
    if not exp_norm: return 1.0
    if exp_norm == rec_norm: return 0.0
    dist = _levenshtein_distance(exp_norm, rec_norm)
    max_len = max(len(exp_norm), len(rec_norm))
    if max_len == 0: return 0.0
    sim = 1.0 - dist / max_len
    # Scale: similar words get cost ~0.2, unrelated words get cost ~1.0
    return round(1.0 - sim * 0.8, 4)


def _classify_word(expected_norm: str | None, recognized_norm: str | None) -> tuple[str, float]:
    """
    Categorize word accuracy based on normalized text comparison.
    Returns: (status, score)
    - CORRECT: Perfect match
    - NEAR: Small distance (e.g., typos, suffixes)
    - WRONG: Significant difference
    - MISSING/EXTRA: Missing or redundant words
    """
    if expected_norm and recognized_norm:
        if expected_norm == recognized_norm:
            return "CORRECT", 1.0

        dist = _levenshtein_distance(expected_norm, recognized_norm)
        max_len = max(len(expected_norm), len(recognized_norm))

        # Heuristic for NEAR status
        if dist == 1:
            if max_len <= 4: return "NEAR", 0.95
            if max_len <= 7: return "NEAR", 0.9
            return "NEAR", 0.85

        sim = 1.0 - dist / max_len
        if sim >= 0.8:
            return "NEAR", 0.7

        return "WRONG", 0.0

    if expected_norm and not recognized_norm: return "MISSING", 0.0
    if not expected_norm and recognized_norm: return "EXTRA", 0.0
    return "WRONG", 0.0

def _extract_recognized_tokens(transcription_result: dict) -> tuple[str, List[RecToken]]:
    """Extract and normalize tokens from WhisperX transcription."""
    recognized_text = transcription_result.get("text") or ""
    segments = transcription_result.get("segments") or []

    # Fallback: Build text from word segments if main text is empty
    if not recognized_text:
        words_tokens = [w.get("word", "") for seg in segments for w in seg.get("words", []) if w.get("word")]
        recognized_text = " ".join(words_tokens)

    raw_tokens = recognized_text.split()
    rec_items = []
    for t in raw_tokens:
        n = normalize_word_lower(t)
        if n: rec_items.append((t, n))

    return recognized_text, rec_items

def _align_words(
    expected_words: list[ShadowingWord],
    expected_norm: List[str | None],
    rec_items: List[RecToken],
) -> List[AlignedItem]:
    """
    Align expected vs recognized words using Dynamic Programming.
    Optimizes for global consistency.
    """
    n, m = len(expected_norm), len(rec_items)
    dp = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1): dp[i][0] = float(i)
    for j in range(1, m + 1): dp[0][j] = float(j)

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = _word_sub_cost(expected_norm[i-1], rec_items[j-1][1])
            dp[i][j] = min(
                dp[i - 1][j - 1] + cost,
                dp[i - 1][j] + 1.0,
                dp[i][j - 1] + 1.0
            )

    # Backtrack path
    EPS = 1e-6
    aligned_rev = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            rec_raw, rec_norm = rec_items[j - 1]
            cost = _word_sub_cost(expected_norm[i - 1], rec_norm)
            if abs(dp[i][j] - (dp[i - 1][j - 1] + cost)) < EPS:
                exp_norm_val = expected_norm[i - 1] or ""
                aligned_rev.append((expected_words[i-1].wordText, exp_norm_val, rec_raw, rec_norm, "MATCH" if cost == 0.0 else "SUBSTITUTE"))
                i, j = i - 1, j - 1
                continue
        if j > 0 and abs(dp[i][j] - (dp[i][j - 1] + 1.0)) < EPS:
            rec_raw, rec_norm = rec_items[j - 1]
            aligned_rev.append((None, None, rec_raw, rec_norm, "INSERT"))
            j -= 1
        elif i > 0:
            aligned_rev.append((expected_words[i-1].wordText, expected_norm[i-1], None, None, "DELETE"))
            i -= 1

    aligned_rev.reverse()
    return aligned_rev

def _compute_fluency_score(word_timestamps: list[dict]) -> tuple[float, float, float]:
    """Heuristic fluency calculation based on pauses and speech rate."""
    if not word_timestamps: return 0.0, 0.0, 0.0
    
    words = sorted(word_timestamps, key=lambda x: x["start"])
    if len(words) == 1:
        duration = words[0]["end"] - words[0]["start"]
        return 1.0, 0.0, round(1.0 / duration if duration > 0 else 0.0, 4)

    pauses = [max(0.0, words[i]["start"] - words[i-1]["end"]) for i in range(1, len(words))]
    avg_pause = sum(pauses) / len(pauses)
    duration = words[-1]["end"] - words[0]["start"]
    speech_rate = len(words) / duration if duration > 0 else 0.0

    # Normalization [0, 1]
    pause_score = max(0.0, min(1.0, 1.0 - (avg_pause / 1.2)))
    target_rate = 2.5
    rate_score = max(0.0, min(1.0, 1.0 - abs(speech_rate - target_rate) / target_rate))

    fluency = (0.55 * pause_score) + (0.45 * rate_score)
    return round(fluency, 4), round(avg_pause, 4), round(speech_rate, 4)

def build_shadowing_result(rq: ShadowingRequest, transcription_result: dict) -> ShadowingResult:
    """Main orchestrator for building the shadowing result."""
    expected_words = rq.expectedWords
    expected_norm = [normalize_word_lower(w.wordText) for w in expected_words]

    # STT extraction
    recognized_text, rec_items = _extract_recognized_tokens(transcription_result)
    
    # Timestamps & Fluency
    segments = transcription_result.get("segments") or []
    word_timestamps = []
    for seg in segments:
        for w in seg.get("words", []):
            if all(k in w for k in ("word", "start", "end")):
                word_timestamps.append(w)
    
    fluency_score, avg_pause, speech_rate = _compute_fluency_score(word_timestamps)
    aligned_items = _align_words(expected_words, expected_norm, rec_items)

    compares: List[ShadowingWordCompare] = []
    correct_count, total_score, extra_words = 0, 0.0, 0
    last_recognized_position = -1

    alpha = float(os.getenv(EXTRA_PENALTY_ALPHA_ENV, DEFAULT_EXTRA_PENALTY_ALPHA))

    for position, (exp_word, exp_norm, rec_raw, rec_norm, align_type) in enumerate(aligned_items):
        if rec_norm is not None:
            last_recognized_position = position
        
        phoneme_diff = None
        if align_type == "INSERT":
            status, score = "EXTRA", 0.0
            extra_words += 1
        elif align_type == "DELETE":
            status, score = "MISSING", 0.0
        else:
            status, score = _classify_word(exp_norm, rec_norm)
            
            # PHONEME UPGRADE LOGIC: Refine scoring using IPA comparison
            if status in ("NEAR", "WRONG") and exp_word and rec_raw:
                p_score, p_diff, exp_ipa, act_ipa = compare_words_with_ipa(exp_word, rec_raw)
                phoneme_diff = {
                    "score": p_score, "diff_tokens": p_diff,
                    "expected_ipa": exp_ipa or get_ipa_string_with_stress(exp_word),
                    "actual_ipa": act_ipa or get_ipa_string_with_stress(rec_raw),
                }
                
                # Accuracy upgrade based on phonetic quality
                if p_score >= 0.9 and status != "CORRECT":
                    status, score = "CORRECT", 1.0
                elif p_score >= 0.75 and status == "WRONG":
                    status, score = "NEAR", 0.7

        # Fallback for phoneme IPA display
        if not phoneme_diff:
            e_ipa = get_ipa_string_with_stress(exp_word) if exp_word else None
            a_ipa = get_ipa_string_with_stress(rec_raw) if rec_raw else None
            phoneme_diff = {
                "score": 1.0 if status == "CORRECT" else 0.0,
                "diff_tokens": [],
                "expected_ipa": e_ipa if status != "EXTRA" else None,
                "actual_ipa": a_ipa if status != "MISSING" else None,
            }

        if status == "CORRECT": correct_count += 1
        if exp_norm is not None: total_score += score

        compares.append(ShadowingWordCompare(
            position=position, expectedWord=exp_word, recognizedWord=rec_raw,
            expectedNormalized=exp_norm, recognizedNormalized=rec_norm,
            status=status, score=score, phonemeDiff=phoneme_diff
        ))

    # Final scoring calculation
    total_words = len(expected_norm)
    accuracy = (correct_count / total_words * 100.0) if total_words > 0 else 0.0
    weighted_denominator = total_words + (alpha * extra_words)
    weighted_accuracy = (total_score / weighted_denominator * 100.0) if weighted_denominator > 0 else 0.0

    return ShadowingResult(
        sentenceId=rq.sentenceId,
        expectedText=" ".join(w.wordText for w in expected_words),
        recognizedText=recognized_text,
        totalWords=total_words,
        correctWords=correct_count,
        accuracy=round(accuracy, 2),
        weightedAccuracy=round(weighted_accuracy, 2),
        fluencyScore=fluency_score,
        avgPause=avg_pause,
        speechRate=speech_rate,
        recognizedWordCount=len(rec_items),
        lastRecognizedPosition=last_recognized_position,
        compares=compares,
    )