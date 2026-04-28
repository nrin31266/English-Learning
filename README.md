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
  - Highlight lỗi phát âm theo từng phoneme với 5 loại màu:
    - 🟢 **MATCH** - Xanh lá
    - 🔴 **MISMATCH** - Đỏ
    - ⚫ **MISSING** - Xám gạch chân
    - 🟡 **EXTRA** - Vàng gạch ngang
    - 🔵 **STRESS_MATCH/WRONG** - Xanh dương/Đỏ đậm
    - 🟣 **PUNCT** - Xám nhạt
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