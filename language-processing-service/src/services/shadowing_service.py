import os
from typing import List, Tuple

from src.dto import ShadowingResult, ShadowingWordCompare, ShadowingRequest, ShadowingWord
from src.services.file_service import normalize_word_lower

# Kiểu token: (raw, normalized)
RecToken = Tuple[str, str]
AlignedItem = Tuple[str | None, str | None, str | None, str | None, str]

DEFAULT_EXTRA_PENALTY_ALPHA = 0.3
EXTRA_PENALTY_ALPHA_ENV = "SHADOWING_EXTRA_PENALTY_ALPHA"


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


def _align_words(
    expected_words: list[ShadowingWord],
    expected_norm: List[str | None],
    rec_items: List[RecToken],
) -> List[AlignedItem]:
    """
    Sequence alignment (DP) giữa expected words và recognized words.

    Output mỗi phần tử gồm:
    (expected_word, expected_norm, recognized_raw, recognized_norm, op)
    op ∈ {MATCH, SUBSTITUTE, INSERT, DELETE}
    """
    n = len(expected_norm)
    m = len(rec_items)

    # dp[i][j] = edit distance tối thiểu để align expected[:i] và recognized[:j]
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        dp[i][0] = i
    for j in range(1, m + 1):
        dp[0][j] = j

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            exp_norm = expected_norm[i - 1] or ""
            rec_norm = rec_items[j - 1][1] or ""
            sub_cost = 0 if exp_norm == rec_norm else 1

            dp[i][j] = min(
                dp[i - 1][j - 1] + sub_cost,  # match/substitute
                dp[i - 1][j] + 1,             # delete (missing)
                dp[i][j - 1] + 1,             # insert (extra)
            )

    # Backtrack từ cuối để lấy alignment path
    aligned_rev: List[AlignedItem] = []
    i, j = n, m

    while i > 0 or j > 0:
        # Ưu tiên đi chéo trước để alignment ổn định hơn.
        if i > 0 and j > 0:
            exp_norm = expected_norm[i - 1] or ""
            rec_raw, rec_norm = rec_items[j - 1]
            sub_cost = 0 if exp_norm == (rec_norm or "") else 1

            if dp[i][j] == dp[i - 1][j - 1] + sub_cost:
                op = "MATCH" if sub_cost == 0 else "SUBSTITUTE"
                aligned_rev.append(
                    (
                        expected_words[i - 1].wordText,
                        expected_norm[i - 1],
                        rec_raw,
                        rec_norm,
                        op,
                    )
                )
                i -= 1
                j -= 1
                continue

        # INSERT = recognized thừa
        if j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            rec_raw, rec_norm = rec_items[j - 1]
            aligned_rev.append((None, None, rec_raw, rec_norm, "INSERT"))
            j -= 1
            continue

        # DELETE = expected bị thiếu
        if i > 0:
            aligned_rev.append(
                (
                    expected_words[i - 1].wordText,
                    expected_norm[i - 1],
                    None,
                    None,
                    "DELETE",
                )
            )
            i -= 1

    aligned_rev.reverse()
    return aligned_rev


def _get_extra_penalty_alpha() -> float:
    """
    Alpha cho penalty tu EXTRA words.

    - Doc tu env SHADOWING_EXTRA_PENALTY_ALPHA.
    - Fallback ve DEFAULT_EXTRA_PENALTY_ALPHA khi env invalid.
    - Clamp ve [0.0, 1.0] de tranh cau hinh qua cuc doan.

    Backward compatibility: dat alpha=0 se ve cong thuc cu.
    """
    raw = os.getenv(EXTRA_PENALTY_ALPHA_ENV, str(DEFAULT_EXTRA_PENALTY_ALPHA))
    try:
        alpha = float(raw)
    except (TypeError, ValueError):
        alpha = DEFAULT_EXTRA_PENALTY_ALPHA

    if alpha < 0.0:
        return 0.0
    if alpha > 1.0:
        return 1.0
    return alpha


def _extract_word_timestamps(transcription_result: dict) -> list[dict]:
    """
    Trích word timestamps từ WhisperX segments.
    Output: [{"word": str, "start": float, "end": float}, ...]
    """
    segments = transcription_result.get("segments") or []
    items: list[dict] = []

    for seg in segments:
        words = seg.get("words") or []
        for w in words:
            start = w.get("start")
            end = w.get("end")
            word = w.get("word")

            if word is None or start is None or end is None:
                continue

            try:
                start_f = float(start)
                end_f = float(end)
            except (TypeError, ValueError):
                continue

            if end_f <= start_f:
                continue

            items.append({"word": str(word), "start": start_f, "end": end_f})

    return items


def _compute_fluency_score(word_timestamps: list[dict]) -> tuple[float, float, float]:
    """
    Heuristic fluency score (không dùng ML):
    - avgPause: khoảng dừng trung bình giữa các từ (giây)
    - speechRate: số từ/giây
    - fluencyScore: [0, 1]
    """
    if not word_timestamps:
        return 0.0, 0.0, 0.0

    # Đảm bảo thứ tự theo thời gian.
    words = sorted(word_timestamps, key=lambda x: x["start"])

    if len(words) == 1:
        duration = words[0]["end"] - words[0]["start"]
        speech_rate = 1.0 / duration if duration > 0 else 0.0
        return round(1.0, 4), 0.0, round(speech_rate, 4)

    pauses: list[float] = []
    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        pauses.append(max(0.0, gap))

    avg_pause = sum(pauses) / len(pauses) if pauses else 0.0

    duration = words[-1]["end"] - words[0]["start"]
    speech_rate = len(words) / duration if duration > 0 else 0.0

    # Pause càng lớn -> điểm càng thấp.
    pause_score = max(0.0, min(1.0, 1.0 - (avg_pause / 1.2)))

    # Speech rate lý tưởng xấp xỉ 2.5 w/s; càng lệch càng giảm điểm.
    target_rate = 2.5
    rate_score = max(0.0, min(1.0, 1.0 - abs(speech_rate - target_rate) / target_rate))

    fluency_score = (0.55 * pause_score) + (0.45 * rate_score)
    fluency_score = max(0.0, min(1.0, fluency_score))

    return round(fluency_score, 4), round(avg_pause, 4), round(speech_rate, 4)


# Main: build_shadowing_result
def build_shadowing_result(
    rq: ShadowingRequest,
    transcription_result: dict,
) -> ShadowingResult:
    expected_words = rq.expectedWords

    # Câu chuẩn để hiển thị
    expected_text = " ".join(w.wordText for w in expected_words)
    # Defensive normalize: payload có thể gửi wordNormalized chưa sạch (vd: "let's").
    # Ưu tiên wordNormalized nếu có, fallback sang wordText để tránh mismatch giả.
    expected_norm = [
        normalize_word_lower(w.wordNormalized) or normalize_word_lower(w.wordText)
        for w in expected_words
    ]

    # Câu recognized + tokens chuẩn hóa
    recognized_text, rec_items = _extract_recognized_tokens(transcription_result)
    word_timestamps = _extract_word_timestamps(transcription_result)
    fluency_score, avg_pause, speech_rate = _compute_fluency_score(word_timestamps)

    aligned_items = _align_words(expected_words, expected_norm, rec_items)

    compares: List[ShadowingWordCompare] = []
    correct_count = 0          # chỉ CORRECT
    total_score = 0.0          # sum(score) cho các từ expected có mặt
    extra_words = 0            # số từ recognized thừa

    last_recognized_position = -1

    for position, aligned in enumerate(aligned_items):
        exp_word, exp_norm, rec_raw, rec_norm, align_type = aligned

        if rec_norm is not None:
            last_recognized_position = position

        if align_type == "INSERT":
            status, score = "EXTRA", 0.0
        elif align_type == "DELETE":
            status, score = "MISSING", 0.0
        else:
            # MATCH/SUBSTITUTE đều dùng classifier cũ để giữ behavior hiện có.
            status, score = _classify_word(exp_norm, rec_norm)

        if status == "CORRECT":
            correct_count += 1

        if status == "EXTRA":
            extra_words += 1

        # chỉ cộng điểm cho các từ expected (không tính EXTRA vào mẫu số)
        if exp_norm is not None:
            total_score += score

        compares.append(
            ShadowingWordCompare(
                position=position,
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
        alpha = _get_extra_penalty_alpha()
        accuracy = (correct_count / total_words) * 100.0
        # Step 2: phạt nhẹ khi user nói thừa.
        # alpha=0 -> giữ hành vi cũ, không phạt EXTRA (backward compatibility).
        weighted_denominator = total_words + alpha * extra_words
        weighted_accuracy = (total_score / weighted_denominator) * 100.0
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
        fluencyScore=fluency_score,
        avgPause=avg_pause,
        speechRate=speech_rate,
        recognizedWordCount=len(rec_items),
        lastRecognizedPosition=last_recognized_position,
        compares=compares,
    )
