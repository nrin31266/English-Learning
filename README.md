# 📌 Tổng quan hệ thống

## 🎯 Mục tiêu
Nền tảng được xây dựng để hỗ trợ học tiếng Anh theo hướng thực hành, cá nhân hóa và tự động hóa nội dung:

- Tạo bài học từ nguồn audio/video.
- Hỗ trợ luyện **Shadowing** và **Dictation** theo từng câu.
- Xử lý từ vựng theo ngữ cảnh và nâng cấp dữ liệu tự động bằng AI.

Hệ thống được chia thành 3 lớp chính:
- **Frontend**: giao diện cho học viên và quản trị viên.
- **Backend Microservices**: xử lý nghiệp vụ, xác thực, lưu trữ, điều phối.
- **AI Service**: xử lý speech-to-text, NLP và pipeline bất đồng bộ.

---

## 🧩 Use case chính

### 1. Học viên học bài và luyện nghe - nói (Shadowing)

- Học viên mở lesson đã xuất bản.
- Hệ thống phát audio theo từng câu và hiển thị transcript.
- Học viên sử dụng **hold-to-record**:
  - Nhấn giữ để ghi âm.
  - Thả để gửi audio lên hệ thống.
  - Kéo chuột ra ngoài để hủy recording.
- Audio được gửi đến AI Service để xử lý speech-to-text.
- Hệ thống chấm điểm:
  - So sánh từng từ với expected words.
  - Trả về `CORRECT / NEAR / WRONG / MISSING / EXTRA`.
- Hiển thị:
  - `accuracy`, `weightedAccuracy`, `fluency`.
  - Highlight lỗi phát âm theo từng từ.
- Phản hồi:
  - 🔊 Phát âm thanh đúng/sai theo điểm.
  - Cho phép nghe lại recording và thử lại nhiều lần.

---

### 2. Học viên tra cứu từ vựng theo ngữ cảnh

- Bấm vào từ trong câu để tra cứu nhanh.
- Hệ thống trả dữ liệu theo trạng thái:

  - **READY** → có dữ liệu đầy đủ  
  - **PROCESSING / FALLBACK** → đang xử lý nền  
  - **FAILED** → lỗi, cần thử lại  

- Dữ liệu từ vựng được AI enrich dần (IPA, nghĩa, ví dụ...).

---

### 3. Admin tạo lesson từ nguồn mới

- Tạo lesson từ:
  - Link YouTube
  - File audio
- Hệ thống chạy pipeline AI bất đồng bộ.

Các bước xử lý:
SOURCE_FETCHED
→ TRANSCRIBED
→ NLP_ANALYZED
→ COMPLETED

- Admin theo dõi realtime tiến độ trên UI.

---

### 4. Admin vận hành pipeline AI

- Retry khi pipeline lỗi  
- Cancel job đang chạy  
- Chỉnh sửa sentence/word sau khi AI sinh dữ liệu  

---

## 🧠 Kiến trúc hệ thống

### 📐 Tổng thể

Hệ thống sử dụng mô hình:

**Microservices + AI Service + Event-driven**

Gồm các layer:

- **Edge layer**: API Gateway (REST + WebSocket)
- **Business layer**: Spring Boot services
- **AI layer**: FastAPI (STT, NLP, scoring)
- **Infrastructure**: Kafka, Redis, DB, Cloudinary, Keycloak

### Nguyên tắc thiết kế

- Đồng bộ → request cần phản hồi nhanh  
- Bất đồng bộ → tác vụ nặng (AI pipeline)  
- Realtime push → theo dõi tiến độ  

---

## 🔄 Luồng hệ thống

### Luồng đồng bộ
Frontend → API Gateway → Service → Response


### Luồng bất đồng bộ (AI pipeline)


Learning Content Service
→ Kafka
→ Language Processing Service
→ Kafka
→ Learning Content Service
→ Kafka
→ Notification Service
→ WebSocket
→ Admin UI

---

## ⚙️ Thành phần chính

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| API Gateway | Spring Cloud Gateway | Entry point REST/WS |
| Discovery Service | Eureka | Service registry |
| Learning Content Service | Spring Boot + PostgreSQL | Quản lý lesson, điều phối pipeline |
| Dictionary Service | Spring Boot + MongoDB | Xử lý từ vựng, fallback |
| Notification Service | WebSocket/STOMP | Push realtime |
| Language Processing Service | FastAPI + WhisperX + spaCy + Gemini | STT, NLP, scoring |
| Kafka | Apache Kafka | Event bus |
| Redis | Redis | Cache, trạng thái tạm |
| Cloudinary | Cloudinary | Lưu audio |
| Keycloak | OAuth2/OIDC | Auth |

---

## 🎤 Recording & Shadowing UX (Cập nhật mới)

### Cải tiến chính

- Chuyển từ **tap → hold-to-record**
- Giảm thao tác, tự nhiên như app học nói thật

### Hành vi

- `pointerDown` → delay → start recording  
- `pointerUp` → stop  
- `pointerLeave` → cancel  

### Xử lý edge cases

- Tab bị ẩn → auto cancel  
- Reload → cleanup  
- Tránh memory leak:
  - revoke Blob URL  
  - stop MediaStream  
  - reset MediaRecorder  

---

## 🔊 Feedback thông minh

- ≥ threshold → phát âm thanh đúng  
- < threshold → phát âm thanh sai  
- Không bị spam âm thanh (check `lastTranscription`)

---

## 🎯 Shadowing scoring (hiện tại)

### 1. Alignment
- Dùng **Dynamic Programming**
- Tránh lệch khi thừa/thiếu từ

### 2. Word classification
- `CORRECT / NEAR / WRONG / MISSING / EXTRA`

### 3. Phoneme analysis
- So sánh IPA expected vs actual
- Trả `phonemeDiff` cho UI

### 4. Sentence metrics
- `accuracy`
- `weightedAccuracy`
- `fluency`

---

## 📌 Kết luận

Hệ thống đạt được:

- Trải nghiệm học **gần với thực tế (shadowing thật)**
- Pipeline AI **mở rộng tốt**
- Kiến trúc rõ ràng:
  - UI (hiển thị)
  - AI (scoring)
  - Service (orchestration)

Phù hợp cho:
- Đồ án
- Portfolio
- Trình bày system design