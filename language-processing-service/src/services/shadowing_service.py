from typing import List, Tuple

from src.dto import ShadowingResult, ShadowingWordCompare, ShadowingRequest
from src.services.file_service import normalize_word_lower

# Kiểu token: (raw, normalized)
RecToken = Tuple[str, str]


# Levenshtein distance + similarity
def _levenshtein_distance(a: str, b: str) -> int:
    """
    Levenshtein distance đơn giản O(len(a) * len(b)).
    Dùng cho từ ngắn nên OK.
    """
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)

    la, lb = len(a), len(b)
    dp = [[0] * (lb + 1) for _ in range(la + 1)]

    for i in range(la + 1):
        dp[i][0] = i
    for j in range(lb + 1):
        dp[0][j] = j

    for i in range(1, la + 1):
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,          # delete
                dp[i][j - 1] + 1,          # insert
                dp[i - 1][j - 1] + cost,   # replace
            )

    return dp[la][lb]




# Phân loại 1 từ (status + score)
def _classify_word(
    expected_norm: str | None,
    recognized_norm: str | None,
) -> tuple[str, float]:
    """
    Trả về (status, score) cho từng cặp từ:
    - CORRECT: giống hệt → 1.0
    - NEAR: khác rất ít (1–2 ký tự) → điểm 0.7–0.95
    - WRONG: có từ ở cả 2 bên nhưng khác đáng kể → 0.0
    - MISSING: thiếu từ → 0.0
    - EXTRA: nói thừa từ → 0.0
    """
    # Có cả 2 bên
    if expected_norm and recognized_norm:
        if expected_norm == recognized_norm:
            return "CORRECT", 1.0

        dist = _levenshtein_distance(expected_norm, recognized_norm)
        max_len = max(len(expected_norm), len(recognized_norm))

        # 1) Rất gần: sai 1 ký tự (vd: news/new, learning/learnin)
        if dist == 1:
            # từ ngắn -> nương tay hơn
            if max_len <= 4:
                return "NEAR", 0.95
            elif max_len <= 7:
                return "NEAR", 0.9
            else:
                return "NEAR", 0.85

        # 2) Hơi lệch hơn 1 tí nhưng vẫn khá giống
        sim = 1.0 - dist / max_len
        if sim >= 0.8:
            return "NEAR", 0.7

        # 3) Còn lại -> sai hẳn
        return "WRONG", 0.0

    # Thiếu từ
    if expected_norm and not recognized_norm:
        return "MISSING", 0.0

    # Thừa từ
    if not expected_norm and recognized_norm:
        return "EXTRA", 0.0

    # Fallback
    return "WRONG", 0.0



# Helper: lấy recognized text + tokens
def _extract_recognized_tokens(transcription_result: dict) -> tuple[str, List[RecToken]]:
    """
    Lấy ra:
    - recognized_text: string đầy đủ
    - rec_items: list[(raw, normalized)]
    """
    recognized_text: str = transcription_result.get("text") or ""
    segments = transcription_result.get("segments") or []

    # Nếu text trống, build từ segments.words
    if not recognized_text:
        words_tokens: List[str] = [
            w.get("word", "")
            for seg in segments
            for w in seg.get("words", [])
            if w.get("word")
        ]
        recognized_text = " ".join(words_tokens)

    raw_tokens = recognized_text.split()
    rec_items: List[RecToken] = []

    for t in raw_tokens:
        n = normalize_word_lower(t)
        if not n:
            continue
        rec_items.append((t, n))

    return recognized_text, rec_items


# Main: build_shadowing_result
def build_shadowing_result(
    rq: ShadowingRequest,
    transcription_result: dict,
) -> ShadowingResult:
    expected_words = rq.expectedWords

    # Câu chuẩn để hiển thị
    expected_text = " ".join(w.wordText for w in expected_words)
    expected_norm = [w.wordNormalized for w in expected_words]

    # Câu recognized + tokens chuẩn hóa
    recognized_text, rec_items = _extract_recognized_tokens(transcription_result)

    expected_len = len(expected_norm)
    rec_len = len(rec_items)
    max_len = max(expected_len, rec_len)

    compares: List[ShadowingWordCompare] = []
    correct_count = 0          # chỉ CORRECT
    total_score = 0.0          # sum(score) cho các từ expected có mặt

    last_recognized_position = -1

    for i in range(max_len):
        exp_word = expected_words[i].wordText if i < expected_len else None
        exp_norm = expected_norm[i] if i < expected_len else None

        rec_raw = rec_items[i][0] if i < rec_len else None
        rec_norm = rec_items[i][1] if i < rec_len else None

        if rec_norm is not None:
            last_recognized_position = i

        status, score = _classify_word(exp_norm, rec_norm)

        if status == "CORRECT":
            correct_count += 1

        # chỉ cộng điểm cho các từ expected (không tính EXTRA vào mẫu số)
        if exp_norm is not None:
            total_score += score

        compares.append(
            ShadowingWordCompare(
                position=i,
                expectedWord=exp_word,
                recognizedWord=rec_raw,
                expectedNormalized=exp_norm,
                recognizedNormalized=rec_norm,
                status=status,
                score=score,
            )
        )

    total_words = len(expected_norm)
    if total_words > 0:
        accuracy = (correct_count / total_words) * 100.0
        weighted_accuracy = (total_score / total_words) * 100.0
    else:
        accuracy = 0.0
        weighted_accuracy = 0.0

    return ShadowingResult(
        sentenceId=rq.sentenceId,
        expectedText=expected_text,
        recognizedText=recognized_text,
        totalWords=total_words,
        correctWords=correct_count,
        accuracy=round(accuracy, 2),
        weightedAccuracy=round(weighted_accuracy, 2),
        recognizedWordCount=len(rec_items),
        lastRecognizedPosition=last_recognized_position,
        compares=compares,
    )
