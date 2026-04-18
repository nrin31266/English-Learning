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

## 🧩 Use case chính

### 1. Học viên học bài và luyện nghe - nói
- Học viên mở lesson đã xuất bản.
- Hệ thống phát audio theo câu, hiển thị transcript.
- Học viên ghi âm giọng nói để luyện shadowing.
- Hệ thống chấm độ chính xác theo từng từ từ kết quả transcription.

### 2. Học viên tra cứu từ vựng theo ngữ cảnh
- Học viên bấm vào từ trong câu để tra cứu nhanh.
- Hệ thống trả kết quả theo trạng thái:
  - **READY**: có dữ liệu đầy đủ.
  - **PROCESSING / FALLBACK**: đang xử lý nền, trả dữ liệu tạm.
  - **FAILED**: xử lý thất bại, cần thử lại sau.

### 3. Admin tạo lesson từ nguồn mới
- Admin tạo lesson từ link YouTube hoặc file audio.
- Hệ thống khởi chạy pipeline AI bất đồng bộ.
- Admin theo dõi tiến độ theo các bước:
  - `SOURCE_FETCHED -> TRANSCRIBED -> NLP_ANALYZED -> COMPLETED`.

### 4. Admin vận hành pipeline AI
- Thực hiện **retry** khi pipeline lỗi.
- **Cancel** job đang chạy.
- Chỉnh sửa sentence/word sau khi AI sinh dữ liệu.

## ⚙️ Vai trò từng phần

| Nhóm thành phần | Thành phần | Vai trò |
|---|---|---|
| Frontend | Learner Web | Học lesson, shadowing, dictation, tra từ |
| Frontend | Admin Web | Quản trị lesson/topic, theo dõi tiến độ realtime |
| Microservices | API Gateway | Điểm vào duy nhất cho REST/WS |
| Microservices | Discovery Service | Service registry cho service discovery |
| Microservices | Learning Content Service | Nghiệp vụ lesson/topic và trạng thái AI generation |
| Microservices | Dictionary Service | Nghiệp vụ từ điển, queue xử lý từ, fallback |
| Microservices | User Service | Quản lý hồ sơ người dùng |
| Microservices | Notification Service | Đẩy sự kiện tiến độ xuống UI qua WebSocket |
| AI | Language Processing Service | STT, NLP, worker pipeline, publish step event |

## 🧠 Vai trò AI trong toàn hệ thống
- **WhisperX**: chuyển giọng nói thành văn bản có timestamp theo từ.
- **spaCy + Gemini**: phân tích ngôn ngữ cho sentence/word.
- **Kafka consumer**: xử lý pipeline tạo lesson theo sự kiện.
- **Word worker**: xử lý nâng cao dữ liệu từ vựng ở nền.
- **Redis + Cloudinary**: quản lý trạng thái tạm và lưu trữ artifact AI.
