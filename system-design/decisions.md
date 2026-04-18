# 🧠 Architectural Decisions

## 1. 📡 Vì sao chọn Kafka

### Quyết định
Sử dụng **Kafka** làm event backbone cho các luồng bất đồng bộ:
- Lesson generation pipeline
- Processing step update/notify

### Lý do
- Tách producer/consumer rõ theo service boundary.
- Xử lý tốt tác vụ dài (audio, NLP) mà không block request/response.
- Dễ mở rộng throughput khi số lesson/job tăng.
- Hỗ trợ theo dõi, debug và replay event khi cần.

### Trade-offs
- Tăng độ phức tạp vận hành (broker, partition, monitoring).
- Bắt buộc xử lý idempotency để tránh update lặp.
- Chấp nhận độ trễ do eventual consistency.

## 2. ⚡ Vì sao chọn Redis

### Quyết định
Sử dụng **Redis** cho dữ liệu tạm thời:
- Cờ hủy AI job (`aiJobStatus:{aiJobId}`)
- Cache read path cho các truy vấn lặp

### Lý do
- Độ trễ thấp, phù hợp read/write tần suất cao.
- Dễ áp TTL cho dữ liệu ngắn hạn.
- Giảm tải cho database chính trong các luồng đọc nhiều.

### Trade-offs
- Không phải source of truth cuối cùng.
- Cần chiến lược key naming và cache invalidation chặt chẽ.
- Cần fallback an toàn khi Redis gặp sự cố.

## 3. 🚀 Vì sao tách AI Service riêng

### Quyết định
Tách **Language Processing Service (Python/FastAPI)** khỏi cụm Java microservices.

### Lý do
- AI/NLP stack phù hợp hệ sinh thái Python (WhisperX, spaCy, Gemini SDK).
- Giảm phụ thuộc runtime phức tạp trong service Java.
- Dễ scale độc lập theo profile CPU/GPU.
- Đội AI có thể phát triển nhanh mà không khóa nhịp release business service.

### Trade-offs
- Tăng chi phí giao tiếp network giữa service.
- Cần contract API/event rõ ràng để tránh lệch schema.
- Cần cơ chế timeout/retry/circuit breaker ở liên kết liên service.

## 📊 Bảng so sánh quyết định chính

| Thành phần | Lý do chọn | Đánh đổi |
|---|---|---|
| Kafka | Xử lý async pipeline, tách tải tác vụ nặng | Vận hành phức tạp, cần idempotency |
| Redis | Trạng thái tạm, hủy job nhanh, cache | Không bền vững như DB chính |
| AI Service tách riêng | Linh hoạt công nghệ và scale độc lập | Tăng chi phí tích hợp và quan sát hệ thống |

## ✅ Kết luận
- Kiến trúc ưu tiên **scalability** và **khả năng mở rộng theo tải AI**.
- Chọn hướng **asynchronous-first** cho bài toán audio/NLP.
- Chấp nhận **eventual consistency** để đổi lấy trải nghiệm responsive và năng lực xử lý lớn.
