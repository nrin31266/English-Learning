# 🚀 English Learning Platform
ẻdockdockeromp
## 📌 Giới thiệu
Đây là nền tảng học tiếng Anh theo mô hình monorepo, kết hợp:
- **Microservices** (Java, Spring Cloud) để xử lý nghiệp vụ.
- **AI Service** (Python, FastAPI) để xử lý NLP, speech-to-text và worker pipeline.
- **Frontend** (React) cho học viên và quản trị nội dung.

## ✨ Tính năng chính
- Học theo bài với chế độ **Shadowing** và **Dictation**.
- Tự động tạo bài học từ nguồn audio/video bằng pipeline AI.
- Tra cứu từ vựng theo ngữ cảnh, có cơ chế fallback khi dữ liệu nâng cao đang xử lý.
- Theo dõi tiến độ xử lý bài học theo thời gian thực trên trang Admin.

## 🧠 Kiến trúc tổng thể (High-level)
Hệ thống được thiết kế theo hướng **event-driven** cho các tác vụ nặng:
- Frontend gọi API qua **API Gateway**.
- **Learning Content Service** điều phối vòng đời tạo lesson.
- **Language Processing Service** xử lý audio/NLP và phản hồi qua Kafka.
- **Notification Service** đẩy trạng thái xử lý xuống UI qua WebSocket.

## ⚙️ Bảng thành phần chính

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| API Gateway | Spring Cloud Gateway | Điểm vào duy nhất, định tuyến REST/WS |
| Discovery Service | Eureka | Quản lý service discovery |
| Learning Content Service | Spring Boot + PostgreSQL | Quản lý lesson/topic, điều phối AI job |
| Dictionary Service | Spring Boot + MongoDB | Quản lý từ vựng, hàng đợi xử lý từ |
| Notification Service | Spring Boot + WebSocket | Đẩy cập nhật tiến độ realtime |
| AI Service | FastAPI + WhisperX + spaCy + Gemini | STT, NLP, xử lý pipeline AI |
| Redis | Redis | Lưu trạng thái tạm/cancel job, cache |
| Kafka | Apache Kafka | Truyền sự kiện bất đồng bộ |

## 🔄 Sơ đồ tổng thể (ASCII)
```text
 [Learner Web]                 [Admin Web]
			|                             |
			+----------- HTTP/WS ---------+
										|
							[API Gateway]
										|
	 +----------------+----------------+----------------+
	 |                |                |                |
[User Service] [Learning Content] [Dictionary] [Notification]
										Service         Service      Service
											|               ^            |
											| Kafka         | Internal   | STOMP/WebSocket
											v               | API        v
				[Language Processing Service (FastAPI)]
							|         |          |         |
						Redis     Kafka    Cloudinary   Worker

							 [Discovery Service (Eureka)]
```

## 📚 Tài liệu hệ thống
Chi tiết thiết kế nằm tại thư mục: [system-design](system-design/)
