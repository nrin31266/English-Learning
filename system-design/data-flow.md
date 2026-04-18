# 🔄 Data Flow

## 1. 🎙️ Shadowing Flow
**Mục tiêu:** chấm phát âm theo từng câu dựa trên audio học viên đọc.

### Các bước xử lý
1. Learner Web lấy `sentence` và `expectedWords` từ dữ liệu lesson.
2. Learner Web upload `audio + sentenceId + expectedWords` lên LPS qua Gateway:
   - `POST /api/lp/speech-to-text/transcribe`
3. Language Processing Service xử lý:
   - Lưu file tạm.
   - Tính độ dài audio.
   - Transcribe bằng WhisperX + word-level alignment.
   - So khớp expected/recognized bằng Levenshtein.
   - Phân loại: `CORRECT`, `NEAR`, `WRONG`, `MISSING`, `EXTRA`.
   - Tính `accuracy` và `weightedAccuracy`.
4. LPS trả về:
   - Segment transcript.
   - `ShadowingResult` chi tiết từng từ.
5. Learner Web hiển thị kết quả và gợi ý luyện tập.

### Flow tóm tắt
```text
Learner Web -> API Gateway -> LPS /speech-to-text/transcribe
         <-  ShadowingResult + segments + scores
```

## 2. 🗣️ Speech-to-Text Flow
**Mục tiêu:** chuyển audio thành transcript có timestamp theo segment/word.

### Các bước xử lý
1. Nguồn audio đến từ:
   - Shadowing request trực tiếp.
   - Pipeline tạo lesson.
2. LPS lazy-load WhisperX model (nếu chưa nạp).
3. LPS thực hiện transcription, lấy language + segments.
4. LPS chạy alignment để gắn mốc thời gian theo từng từ.
5. Kết quả được dùng cho:
   - Chấm shadowing theo thời gian thực.
   - Build sentence/word metadata cho lesson generation.

## 3. 🚀 Lesson Generation Flow (Kafka Pipeline)
**Mục tiêu:** tự động tạo lesson từ YouTube/file audio và cập nhật tiến độ theo event.

### Các bước xử lý
1. Admin tạo hoặc retry lesson trong Learning Content Service.
2. Learning Content Service tạo `aiJobId` (gọi LPS `/ai-jobs`) và set lesson `PROCESSING`.
3. Learning Content Service publish `LessonGenerationRequestedEvent` lên topic:
   - `lesson-generation-requested-v1`
4. LPS Kafka consumer nhận event và xử lý theo bước:
   - `SOURCE_FETCHED`: tải audio, upload Cloudinary.
   - `TRANSCRIBED`: speech-to-text.
   - `NLP_ANALYZED`: Gemini phân tích sentence theo batch.
   - `COMPLETED`: hoàn tất pipeline.
5. Sau mỗi bước, LPS publish `LessonProcessingStepUpdatedEvent`:
   - `lesson-processing-step-updated-v1`
6. Learning Content Service consume event, cập nhật lesson state và metadata URL.
7. Learning Content Service publish notify event:
   - `lesson-processing-step-notify-v1`
8. Notification Service consume notify event và push qua STOMP/WebSocket.
9. Admin Web nhận event và cập nhật tiến độ realtime.

### Flow tóm tắt
```text
Admin Web
  -> API Gateway
  -> Learning Content Service
  -> Kafka (lesson-generation-requested-v1)
  -> AI Service (LPS)
  -> Kafka (lesson-processing-step-updated-v1)
  -> Learning Content Service
  -> Kafka (lesson-processing-step-notify-v1)
  -> Notification Service
  -> WebSocket/STOMP
  -> Admin Web (realtime update)
```

## 4. ⚙️ Word Worker Flow
**Mục tiêu:** xử lý nâng cao dữ liệu từ vựng ở nền, không chặn trải nghiệm tra từ.

### Các bước xử lý
1. Learner tra từ qua Dictionary Service.
2. Nếu từ chưa sẵn sàng:
   - Dictionary lưu với trạng thái `PENDING`.
   - Trả về `PROCESSING` hoặc `FALLBACK` để người dùng tiếp tục học.
3. Word Worker (Python) polling Dictionary internal API:
   - `POST /internal/words/claim`
4. Mỗi job được xử lý tuần tự:
   - Phân tích bằng Gemini.
   - Tạo audio UK/US bằng TTS.
   - Upload artifact lên Cloudinary.
5. Worker báo cáo kết quả:
   - Success: `POST /internal/words/success`
   - Fail: `POST /internal/words/fail`
6. Dictionary Service cập nhật trạng thái `READY` hoặc `FAILED`.
7. Lần tra cứu sau sẽ trả dữ liệu đầy đủ nếu đã `READY`.

### Bảng trạng thái từ vựng

| Trạng thái | Ý nghĩa | Hành vi phía client |
|---|---|---|
| PENDING | Đã vào hàng đợi xử lý | Hiển thị chờ xử lý |
| PROCESSING | Worker đang xử lý | Có thể hiển thị dữ liệu tạm |
| READY | Dữ liệu hoàn chỉnh | Hiển thị đầy đủ định nghĩa/âm thanh |
| FAILED | Xử lý thất bại | Báo lỗi mềm, gợi ý thử lại |
