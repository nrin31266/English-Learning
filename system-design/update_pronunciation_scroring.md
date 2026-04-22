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
🚀 PROMPT 5 — FEEDBACK SYSTEM (UI-CRITICAL VERSION)

🎯 Mục tiêu
Sinh feedback cho người học. Phải ngắn, rõ, không mơ hồ, không tự suy diễn ngoài data ta đã có kèm đã xử lí.



🧠 RULE ENGINE (STRICT PRIORITY ORDER) + CÓ THỂ TỰ NGHĨ THÊM NẾU BẠN THẤY HAY
🔴 RULE 1 — EXTRA WORD (cao nhất về UX)
if status == "EXTRA"
→ "bạn đang nói thừa từ"
🔴 RULE 2 — MISSING WORD
if status == "MISSING"
→ "thiếu từ trong câu"
🟠 RULE 3 — PRONUNCIATION WEAK (phoneme-based từ STEP 4)
if status in ("WRONG", "NEAR") AND phonemeScore < 0.7
→ "phát âm chưa rõ"

👉 (KHÔNG phân tích vowel/CMU lại, chỉ dùng score)

🟡 RULE 4 — NEAR WORD
if status == "NEAR"
→ "gần đúng, cần rõ hơn"
🟢 RULE 5 — CORRECT (optional)
if status == "CORRECT"
→ null
🧪 EDGE CASE RULE
Nếu phonemeScore == null → bỏ qua rule phoneme
Nếu nhiều rule match → chọn rule cao nhất theo priority
🎯 OUTPUT CONTRACT
feedback: string | null
🧪 TEST CASES
Case 1
apples → apple
status: MISSING
→ "thiếu từ trong câu"
Case 2
sheep → ship
phonemeScore: 0.55
→ "phát âm chưa rõ"
Case 3
I really like apples
status: EXTRA (really)
→ "bạn đang nói thừa từ"
Case 4
good afternoon
status: CORRECT
→ null
🎨 UI CONTRACT (GIỮ NGUYÊN)
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


## pipeline tách 2 tầng chấm
1. Hoàn tất căn chỉnh (Alignment)

Hệ thống thực hiện căn chỉnh (alignment) giữa chuỗi từ của câu mẫu (expected) và câu người dùng nói (recognized).
Kết quả là một danh sách các cặp từ tương ứng hoặc các trường hợp lệch (insert/delete).

2. Phân loại sơ bộ bằng _classify_word (char-level)

Sau alignment, mỗi cặp từ được đưa qua hàm _classify_word để phân loại dựa trên so sánh ký tự (char-level):

CORRECT: giống hoàn toàn
NEAR: sai nhẹ (gần đúng)
WRONG: sai rõ ràng
MISSING: thiếu từ
EXTRA: từ nói thừa

👉 Đây là bước QUYẾT ĐỊNH NHÁNH XỬ LÝ, không phải bước chấm điểm cuối cùng.

3. Routing xử lý theo loại kết quả
✅ Trường hợp CORRECT
Không cần CMU
Giữ nguyên kết quả
Chỉ hiển thị trạng thái đúng

👉 CMU không tham gia

⚠️ Trường hợp NEAR / WRONG
Đây là nhóm cần phân tích phát âm
Hệ thống gọi CMU service để lấy phoneme (ARPABET)
Chuyển sang IPA
So sánh từng âm vị (phoneme-level diff)

👉 Mục tiêu:

giải thích “sai ở âm nào”
tạo diff trực quan (æ → ɑː, v.v.)
⚠️ Trường hợp MISSING / EXTRA
CMU được dùng chỉ để hỗ trợ hiển thị âm thanh của từ
expected word → IPA
recognized word → IPA (nếu có)
Không thực hiện so sánh phoneme diff chính

👉 Mục tiêu:

giải thích “thiếu từ gì / thừa từ gì”
có thể kèm IPA để user hiểu cách đọc từ đó
4. Tạo phản hồi (UI Feedback Layer)
Với NEAR / WRONG:
Hiển thị:
IPA expected vs actual
bảng so sánh từng phoneme
highlight vị trí sai

Ví dụ:

æ → ɑː
k → r (missing/substitute)
Với EXTRA / MISSING:
Hiển thị dạng giải thích ngữ nghĩa:
“Bạn đã nói thêm từ X”
“Bạn đã bỏ sót từ Y”
Có thể kèm IPA của từ liên quan để hỗ trợ học phát âm
⚠️ Chốt kiến trúc quan trọng (điểm bạn cần giữ)
_classify_word = quyết định nhánh xử lý
CMU service = chỉ cung cấp phoneme/IPA + diff visualization
CMU không tham gia quyết định NEAR/WRONG
CMU không biết pipeline
🧠 1 câu chốt để tránh sai kiến trúc lại

_classify_word quyết định “có cần nghe kỹ không”
CMU chỉ trả lời “âm đó đọc như thế nào”