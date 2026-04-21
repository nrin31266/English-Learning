# 🎯 Shadowing Scoring Flow (Hiện tại)

## 📌 Mục tiêu
Tài liệu này mô tả **flow chấm điểm shadowing hiện tại** của dự án, từ lúc học viên ghi âm cho đến khi UI hiển thị điểm và quyết định qua câu.

Phạm vi:
- Learner Web (frontend)
- Language Processing Service (backend FastAPI)
- Công thức tính điểm và ngưỡng hiện tại

---

## 1. Tổng quan luồng

```text
Learner Web (record audio)
  -> API Gateway
  -> LPS: POST /speech-to-text/transcribe
      - WhisperX transcribe + align
      - Build ShadowingResult (word-by-word)
  <- ApiResponse<TranscriptionResponse + ShadowingResult>
  <- Learner Web render kết quả, phát feedback sound, show Next/Skip
```

---

## 2. Chi tiết theo bước

### Bước 1: Frontend chuẩn bị dữ liệu
Trong màn hình shadowing:
1. User bấm ghi âm câu hiện tại.
2. Frontend tạo `expectedWords` từ `currentSentence.lessonWords`.
3. Frontend sort theo `orderIndex` để giữ đúng thứ tự từ.
4. Frontend gửi multipart/form-data gồm:
   - `file` (audio/webm)
   - `sentenceId`
   - `expectedWords` (JSON string)

Endpoint gọi qua gateway:
- `POST /api/lp/speech-to-text/transcribe`

### Bước 2: Router speech-to-text xử lý request
LPS router `/speech-to-text/transcribe`:
1. Parse `expectedWords` thành `ShadowingRequest`.
2. Validate extension audio (`.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.webm`).
3. Lưu file tạm vào `src/temp/shadowing`.
4. Tính duration audio.
5. Gọi service transcribe (WhisperX).
6. Gọi `build_shadowing_result(...)` để chấm điểm.
7. Trả response gồm transcript segments + `shadowingResult`.
8. Xóa file tạm sau khi xử lý.

### Bước 3: WhisperX transcribe + align
Service speech-to-text:
1. Lazy-load model WhisperX nếu chưa có.
2. Chạy `transcribe(...)` lấy text/segments.
3. Chạy `whisperx.align(...)` để có word-level timing.

Lưu ý: phần align phục vụ timestamp tốt cho transcript, còn logic chấm điểm hiện tại dựa chính vào so khớp text normalized.

### Bước 4: Build ShadowingResult (chấm điểm)
Core nằm ở `shadowing_service.py`.

#### 4.1 Chuẩn hóa token
- `normalize_word_lower(...)`:
  - lowercase
  - bỏ dấu `'`
  - chỉ giữ `a-z0-9`

Ví dụ:
- `It's` -> `its`
- `Hello,` -> `hello`

#### 4.2 So khớp từ theo vị trí
Vòng lặp chạy từ `0..max(expected_len, rec_len)-1`.
Mỗi vị trí lấy:
- expected token (nếu có)
- recognized token (nếu có)

Sau đó phân loại trạng thái bằng `_classify_word(...)`.

#### 4.3 Rule phân loại và điểm
Các trạng thái:
- `CORRECT`: giống hệt -> `1.0`
- `NEAR`: gần giống -> `0.95 / 0.9 / 0.85 / 0.7`
- `WRONG`: sai rõ rệt -> `0.0`
- `MISSING`: thiếu từ -> `0.0`
- `EXTRA`: thừa từ -> `0.0`

Chi tiết NEAR:
1. Nếu Levenshtein distance = 1:
   - độ dài <= 4 -> `0.95`
   - độ dài <= 7 -> `0.9`
   - còn lại -> `0.85`
2. Nếu similarity >= 0.8 (`1 - dist / max_len`) -> `0.7`

#### 4.4 Chỉ số đầu ra
- `correctWords`: chỉ đếm `CORRECT`
- `accuracy`:

$$
accuracy = \frac{correctWords}{totalWords} \times 100
$$

- `weightedAccuracy`:

$$
weightedAccuracy = \frac{\sum score\ (trên\ expected\ words)}{totalWords} \times 100
$$

Lưu ý quan trọng:
- `EXTRA` không được cộng vào mẫu số vì mẫu số luôn là `totalWords` của expected sentence.

---

## 3. Frontend sử dụng điểm như thế nào

Sau khi nhận `shadowingResult`:
1. Render panel kết quả theo từng từ (`CORRECT/NEAR/WRONG/MISSING/EXTRA`).
2. Dùng `weightedAccuracy` để quyết định:
   - `>= 85`: qua câu (`Next sentence`) + âm thanh thành công
   - `< 85`: hiển thị `Skip this sentence` + âm thanh fail
3. Hiển thị message mức độ:
   - `>= 85`: Excellent
   - `>= 60`: Good
   - còn lại: Focus on highlighted words

---

## 4. Response contract (rút gọn)

```json
{
  "code": 200,
  "message": "Success",
  "result": {
    "id": "...",
    "filename": "recording.webm",
    "duration": 2.31,
    "language": "en",
    "segments": [
      {
        "start": 0.0,
        "end": 2.2,
        "text": "...",
        "words": []
      }
    ],
    "full_text": "...",
    "shadowingResult": {
      "sentenceId": 123,
      "expectedText": "...",
      "recognizedText": "...",
      "totalWords": 7,
      "correctWords": 5,
      "accuracy": 71.43,
      "weightedAccuracy": 84.29,
      "recognizedWordCount": 8,
      "lastRecognizedPosition": 7,
      "compares": [
        {
          "position": 0,
          "expectedWord": "I",
          "recognizedWord": "I",
          "expectedNormalized": "i",
          "recognizedNormalized": "i",
          "status": "CORRECT",
          "score": 1.0
        }
      ]
    }
  }
}
```

---

## 5. Đặc tính hiện tại của thuật toán

### Điểm mạnh
- Dễ hiểu, dễ debug, dễ tune ngưỡng.
- Có mức `NEAR` nên không quá gắt với lỗi nhỏ.
- Có feedback theo từng từ để người học biết sai ở đâu.

### Giới hạn
- Đây là **text-based scoring**, chưa phải acoustic/phoneme-based scoring.
- So khớp theo vị trí cứng, nên dễ lệch dây chuyền nếu chèn/thừa từ sớm.
- `EXTRA` hiện không làm tăng mẫu số tính `weightedAccuracy`.

---

## 6. Mapping với tài liệu hệ thống
Flow này tương ứng với phần:
- `system-design/data-flow.md` -> mục Shadowing Flow
- `system-design/ai-service.md` -> module `speech_to_text_service` và `shadowing_service`

Tài liệu này đi sâu riêng vào cơ chế chấm điểm và cách frontend tiêu thụ kết quả.
