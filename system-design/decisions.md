# 🧠 Architectural Decisions

Tài liệu này mô tả các quyết định kiến trúc chính trong hệ thống, bao gồm lý do lựa chọn và các đánh đổi đi kèm.

---

## 1. 📡 Vì sao chọn Kafka

### Quyết định
Sử dụng **Kafka** làm event backbone cho các luồng bất đồng bộ:

- Lesson generation pipeline  
- Processing step update / notify  
- Giao tiếp giữa các service AI và backend  

---

### Lý do

- Tách producer/consumer rõ theo service boundary  
- Không block request/response với tác vụ nặng (audio, NLP)  
- Scale tốt theo throughput (partition, consumer group)  
- Hỗ trợ:
  - Replay event
  - Debug pipeline
  - Theo dõi tiến trình xử lý  

---

### Trade-offs

- Tăng độ phức tạp vận hành (broker, partition, monitoring)  
- Bắt buộc xử lý **idempotency** để tránh duplicate event  
- Chấp nhận **eventual consistency**  

---

## 2. ⚡ Vì sao chọn Redis

### Quyết định
Sử dụng **Redis** cho dữ liệu tạm thời và trạng thái runtime:

- Cờ hủy AI job: `aiJobStatus:{aiJobId}`  
- Cache cho các truy vấn lặp  
- Trạng thái ngắn hạn trong pipeline  

---

### Lý do

- Độ trễ cực thấp (in-memory)  
- Hỗ trợ TTL tự động  
- Giảm tải database chính  
- Phù hợp cho trạng thái ephemeral  

---

### Trade-offs

- Không phải source of truth  
- Cần chiến lược:
  - Key naming rõ ràng  
  - Cache invalidation  
- Cần fallback khi Redis lỗi  

---

## 3. 🚀 Vì sao tách AI Service riêng

### Quyết định
Tách **Language Processing Service (Python/FastAPI)** khỏi hệ Java microservices.

---

### Lý do

- Ecosystem Python mạnh cho AI:
  - WhisperX
  - spaCy
  - Gemini SDK  
- Tránh đưa dependency nặng vào Java service  
- Scale độc lập:
  - CPU-bound (NLP)
  - GPU-bound (STT)  
- Cho phép phát triển AI nhanh, không phụ thuộc release cycle backend  

---

### Trade-offs

- Tăng network call giữa service  
- Cần contract API/event rõ ràng  
- Cần:
  - timeout
  - retry
  - circuit breaker  

---

## 4. 🎯 Vì sao chọn Event-driven cho AI Pipeline

### Quyết định
Áp dụng mô hình **event-driven architecture** cho pipeline AI.

---

### Lý do

- Pipeline gồm nhiều bước dài:
  - fetch audio
  - transcribe
  - NLP
- Không phù hợp synchronous flow  
- Cho phép:
  - retry từng step  
  - theo dõi tiến độ realtime  
  - scale từng bước độc lập  

---

### Trade-offs

- Debug khó hơn flow sync  
- Cần thiết kế event schema rõ ràng  
- Cần xử lý consistency  

---

## 5. 🎤 Vì sao dùng Hold-to-Record (Frontend UX)

### Quyết định
Chuyển từ **tap-to-record → hold-to-record**

---

### Lý do

- Giống hành vi tự nhiên (Zalo, Messenger, Duolingo)  
- Giảm số bước thao tác  
- Tránh quên stop recording  
- Tăng trải nghiệm luyện nói liên tục  

---

### Trade-offs

- Phức tạp hơn về xử lý event:
  - `pointerDown / pointerUp / pointerLeave`  
- Cần xử lý edge case:
  - tab hidden  
  - reload page  
  - cancel recording  
- Cần cleanup resource:
  - MediaRecorder  
  - MediaStream  
  - Blob URL  

---

## 6. 🧠 Vì sao dùng DP cho Shadowing Alignment

### Quyết định
Sử dụng **Dynamic Programming** để align:

- expected words  
- recognized words  

---

### Lý do

- Xử lý tốt:
  - thiếu từ (MISSING)  
  - thừa từ (EXTRA)  
- Tránh lỗi “lệch dây chuyền”  
- Đảm bảo scoring chính xác theo từng từ  

---

### Trade-offs

- Tốn thêm compute so với so khớp đơn giản  
- Phức tạp hơn khi implement  

---

## 📊 Bảng tổng hợp quyết định

| Thành phần | Lý do chọn | Đánh đổi |
|---|---|---|
| Kafka | Async pipeline, scale tốt | Vận hành phức tạp |
| Redis | Trạng thái tạm, cache nhanh | Không bền vững |
| AI Service riêng | Linh hoạt công nghệ | Tăng network cost |
| Event-driven | Phù hợp pipeline dài | Debug khó hơn |
| Hold-to-record | UX tự nhiên | Logic phức tạp hơn |
| DP Alignment | Scoring chính xác | Tốn compute hơn |

---

## ✅ Kết luận

Hệ thống được thiết kế theo hướng:

- **Async-first** cho AI pipeline  
- **Scalable** theo tải xử lý audio/NLP  
- **Tách biệt rõ trách nhiệm**:
  - UI → hiển thị  
  - AI → scoring  
  - Service → orchestration  

Chấp nhận:

- **Eventual consistency**  
- **Độ phức tạp cao hơn**  

để đổi lấy:

- Khả năng mở rộng  
- Hiệu năng xử lý  
- Trải nghiệm người dùng tốt hơn  