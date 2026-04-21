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
🚀 PROMPT 4 — PHONEME SCORE (BASIC)
🎯 Mục tiêu

Biết user sai âm.

🧠 Prompt
1. Viết hàm get_phonemes(word):
   - dùng CMU dict
   - return list phoneme

2. Viết compare_phonemes(expected, actual):
   - Levenshtein phoneme
   - return score 0-1

3. Trong build_shadowing_result:
   - thêm phonemeScore vào từng word
🧪 TEST
Input:
expected: apples
user nói: apple
✅ Expected:
{
  "phonemeScore": 0.7
}
🎨 UI update
{phonemeScore && (
  <div className="text-xs text-gray-500">
    Pronunciation: {Math.round(phonemeScore * 100)}%
  </div>
)}
🚀 PROMPT 5 — FEEDBACK TEXT
🎯 Mục tiêu

Hiển thị lỗi cụ thể.

🧠 Prompt
Trong build_shadowing_result:

1. Nếu phoneme cuối bị thiếu:
   → feedback = "thiếu âm cuối /X/"

2. Nếu sai nguyên âm:
   → "nguyên âm chưa rõ"

3. Nếu NEAR:
   → "gần đúng, cần rõ hơn"

Thêm field:
feedback: str | None
🧪 TEST
apples → apple
✅ Expected
{
  "feedback": "thiếu âm cuối /Z/"
}
🎨 UI update
{feedback && (
  <div className="text-red-500 text-xs">
    {feedback}
  </div>
)}
💥 TỔNG KẾT LUỒNG TEST
Sau PROMPT 1

👉 Fix lệch từ
👉 UI thấy EXTRA

Sau PROMPT 2

👉 điểm thực tế hơn

Sau PROMPT 3

👉 có Fluency

Sau PROMPT 4–5

👉 có pronunciation thật


## Phân tích từng bước (1–5) theo máy bạn
👉 1–5 là hệ hybrid (rule-based + ML nhẹ), KHÔNG phải AI thuần
👉 Và với máy bạn (A2000 4GB + i7), đây chính là hướng tối ưu nhất

🟢 PROMPT 1 — Alignment

👉 100% nên làm

không tốn GPU
cải thiện chất lượng ngay lập tức
cost = 0

👉 đây là best ROI

🟢 PROMPT 2 — EXTRA penalty

👉 nên làm

logic thuần Python
không ảnh hưởng performance
🟢 PROMPT 3 — Fluency

👉 rất hợp

dùng timestamp sẵn từ WhisperX
không cần ML thêm
🟡 PROMPT 4 — Phoneme

👉 làm được nhưng:

KHÔNG dùng model nặng
chỉ dùng dictionary (CMU)

👉 tức là:

❗ không phải “AI nghe âm”, mà là “ước lượng”

🟡 PROMPT 5 — Feedback

👉 cực kỳ nên làm

rule-based
UX tăng mạnh
không tốn tài nguyên