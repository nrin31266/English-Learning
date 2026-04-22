🚀 PROMPT 1 — FIX ALIGNMENT (BẮT BUỘC)
🎯 Mục tiêu

Fix lỗi lệch dây chuyền khi user nói thừa/thiếu từ.

🧠 Prompt
Refactor build_shadowing_result trong shadowing_service.py:

1. Thay loop index-based bằng alignment-based:
   - Viết hàm align_words(expected_norm, rec_items)
   - Dùng dynamic programming (edit distance sequence alignment)
   - Output list các cặp:
     (expectedWord, expectedNorm, recognizedRaw, recognizedNorm, type)

type gồm:
- MATCH
- SUBSTITUTE
- INSERT (EXTRA)
- DELETE (MISSING)

2. build_shadowing_result sẽ loop trên kết quả alignment thay vì range(max_len)

3. Mapping:
- MATCH → dùng _classify_word
- SUBSTITUTE → WRONG/NEAR
- INSERT → EXTRA
- DELETE → MISSING

Không thay đổi response structure hiện tại.
🧪 TEST
Input:
expected: I like apples
recognized: I really like apples
✅ Expected output (compares)
[
  { "expectedWord": "I", "recognizedWord": "I", "status": "CORRECT" },
  { "expectedWord": null, "recognizedWord": "really", "status": "EXTRA" },
  { "expectedWord": "like", "recognizedWord": "like", "status": "CORRECT" },
  { "expectedWord": "apples", "recognizedWord": "apples", "status": "CORRECT" }
]
🎨 UI cần update
File: ShadowingResultPanel.tsx

👉 thêm case:

if (status === "EXTRA") {
  return <span className="text-yellow-500">+{word}</span>
}
👀 Mong đợi UI
I +really like apples
🚀 PROMPT 2 — PHẠT EXTRA (SCORING)
🎯 Mục tiêu

Tránh user nói thừa mà vẫn điểm cao.

🧠 Prompt
Trong build_shadowing_result:

1. Đếm số lượng EXTRA words
2. Thêm biến:

alpha = 0.3

3. Update weightedAccuracy:

weighted_accuracy = total_score / (total_words + alpha * extra_words)

4. Giữ nguyên accuracy cũ

5. Nếu extra_words = 0 → kết quả không đổi
🧪 TEST
Input:
expected: I like apples
recognized: I really really like apples
✅ Expected:
weightedAccuracy < 100
🎨 UI update
File: ActiveSentencePanel.tsx

👉 không đổi UI
👉 nhưng logic pass:

const pass = weightedAccuracy >= 85

👉 giờ sẽ fail đúng hơn

👀 Mong đợi
Trước: pass
Sau: fail (đúng)
🚀 PROMPT 3 — FLUENCY SCORE
🎯 Mục tiêu

Thêm điểm trôi chảy.

🧠 Prompt
1. Viết hàm extract_word_timestamps(transcription_result)

Output:
[
  { word, start, end }
]

2. Viết compute_fluency_score:

- avgPause = khoảng cách giữa từ
- speechRate = words / duration

Return:
{
  fluencyScore: 0-1,
  avgPause,
  speechRate
}

3. Thêm vào ShadowingResult:
- fluencyScore
- avgPause
- speechRate
🧪 TEST
Input:
User nói ngập ngừng (pause lớn)
✅ Expected JSON
{
  "fluencyScore": 0.4,
  "avgPause": 0.8,
  "speechRate": 1.2
}
🎨 UI update
File: ShadowingResultPanel.tsx

👉 thêm:

<div>Fluency: {Math.round(fluencyScore * 100)}%</div>
👀 UI mong đợi
Fluency: 40%
🚀 PROMPT 4 — PHONEME SCORE (CMU-FIRST + FALLBACK)
🎯 Mục tiêu

Chấm điểm phát âm dựa trên phoneme, không dùng AI audio model.

🧠 Yêu cầu implement
1. CMU Pronouncing Dictionary (PRIMARY)
def get_phonemes(word: str) -> list[str] | None:
    """
    Return phoneme list từ CMU dict.
    Nếu không có → return None
    """
normalize word:
lowercase
remove punctuation
lấy pronunciation đầu tiên nếu nhiều variant
2. Char-level fallback (SECONDARY)
def char_level_score(expected: str, actual: str) -> float:
    """
    Levenshtein trên ký tự (fallback khi không có CMU)
    """
    distance = edit_distance(expected, actual)
    return max(0.0, 1 - distance / max(len(expected), len(actual)))
3. Phoneme comparison (PRIMARY LOGIC)
def compare_phonemes(expected: list[str], actual: list[str]) -> float:
    """
    Levenshtein trên phoneme sequence
    return score 0–1
    """
4. Wrapper scoring logic
def get_pronunciation_score(expected_word: str, recognized_word: str) -> float:
    """
    Priority:
    1. CMU both → phoneme compare
    2. CMU missing → fallback char-level
    """

Logic:

if cmu(expected) and cmu(recognized):
    return phoneme_score
else:
    return char_level_score
5. Integration vào build_shadowing_result

Thêm:

"phonemeScore": 0.0 - 1.0 | null

Chỉ apply khi:

status != EXTRA
status != MISSING
🧪 TEST
expected: apples
recognized: apple

Expected:

phonemeScore ~ 0.6 - 0.85
🚀 PROMPT 5 — FEEDBACK SYSTEM (RULE-BASED)
🎯 Mục tiêu

Sinh feedback ngắn, dễ hiểu, không AI.

🧠 Rules
1. Missing ending sound
if expected endswith phoneme Z/S but missing:
    return "thiếu âm cuối /Z/"
2. Vowel issue
if vowel phoneme mismatch:
    return "nguyên âm chưa rõ"
3. NEAR status
if status == "NEAR":
    return "gần đúng, cần rõ hơn"
4. fallback
return None
🧪 TEST
apples → apple

Expected:

"thiếu âm cuối /Z/"
🎨 UI UPDATE (FINAL)
{c.phonemeScore != null && (
  <div className="text-xs text-muted-foreground">
    Pronunciation: {Math.round(c.phonemeScore * 100)}%
  </div>
)}

{c.feedback && (
  <div className="text-red-500 text-xs">
    {c.feedback}
  </div>
)}
💡 FINAL DESIGN (QUAN TRỌNG)
Pipeline đúng:
CMU phoneme → PRIMARY
    ↓ fail
char-level fallback
❌ KHÔNG dùng:
AI speech model
neural phoneme recognition
GPU inference
✅ CHỈ dùng:
CMU dict
edit distance
rule-based feedback
🔥 Kết luận

👉 Step 4 của bạn:

nhẹ
deterministic
chạy tốt 4GB VRAM
đủ “Duolingo-lite quality”