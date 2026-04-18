# 🧠 Architecture

## 📐 Kiến trúc tổng thể
Hệ thống được tổ chức theo mô hình phân lớp, kết hợp **microservices + AI service**:
- **Edge layer**: API Gateway tiếp nhận toàn bộ request từ frontend.
- **Business layer**: các service Spring Boot xử lý nghiệp vụ cốt lõi.
- **AI layer**: FastAPI xử lý speech-to-text, NLP và worker.
- **Infrastructure layer**: Kafka, Redis, PostgreSQL, MongoDB, Cloudinary, Keycloak.

Nguyên tắc thiết kế:
- Dùng **đồng bộ** cho nghiệp vụ cần phản hồi nhanh.
- Dùng **bất đồng bộ** cho tác vụ nặng và kéo dài.
- Dùng **realtime push** để cập nhật tiến độ xử lý cho Admin.

## 🚪 Vai trò API Gateway
API Gateway là điểm vào duy nhất của hệ thống:
- Định tuyến REST đến các service:
  - `/api/user-profiles/** -> user-service`
  - `/api/dictionaries/** -> dictionary-service`
  - `/api/learning-contents/** -> learning-content-service`
  - `/api/lp/** -> language-processing-service`
- Định tuyến WebSocket:
  - `/ws/** -> notification-service`
- Quản lý CORS tập trung và loại bỏ header trùng lặp.

Giá trị mang lại:
- Frontend không cần biết endpoint nội bộ từng service.
- Dễ bổ sung auth policy, rate-limit, logging, tracing tại một điểm.

## 🛰️ Vai trò Eureka (Discovery Service)
Eureka cung cấp cơ chế service discovery trong hệ Spring Cloud:
- Đăng ký và tra cứu service theo tên logic.
- Hỗ trợ load-balancing theo service name (ví dụ: `lb://notification-service`).
- Tạo nền tảng mở rộng nhiều instance service.

Ghi chú hiện trạng:
- Một số route vẫn dùng URI tĩnh (`localhost`) trong Gateway.
- Eureka đã sẵn sàng để chuyển dần sang discovery đầy đủ.

## 🧩 Bảng thành phần hệ thống

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Learner Web | React | Trải nghiệm học tập: lesson, shadowing, dictation |
| Admin Web | React | Quản trị lesson/topic, theo dõi tiến độ AI |
| API Gateway | Spring Cloud Gateway | Entry point và định tuyến REST/WS |
| Discovery Service | Spring Cloud Netflix Eureka | Service registry |
| User Service | Spring Boot + PostgreSQL | Hồ sơ và thông tin người dùng |
| Learning Content Service | Spring Boot + PostgreSQL | Quản lý lesson, điều phối pipeline AI |
| Dictionary Service | Spring Boot + MongoDB | Tra cứu từ, quản lý trạng thái word processing |
| Notification Service | Spring Boot + WebSocket/STOMP | Đẩy sự kiện realtime tới UI |
| AI Service | FastAPI + WhisperX + spaCy + Gemini | STT, NLP, worker xử lý nền |
| Kafka | Apache Kafka | Event bus giữa các service |
| Redis | Redis | Cache và trạng thái hủy AI job |
| Cloudinary | Cloudinary | Lưu audio/metadata artifact |
| Keycloak | OAuth2/OIDC | Cấp phát và xác thực JWT |

## 🔄 Góc nhìn luồng kết nối

### Luồng đồng bộ (request/response)
```text
Frontend -> API Gateway -> Business Service -> Database
```

### Luồng bất đồng bộ (event-driven)
```text
Learning Content Service
    -> Kafka (lesson-generation-requested-v1)
    -> AI Service
    -> Kafka (lesson-processing-step-updated-v1)
    -> Learning Content Service
    -> Kafka (lesson-processing-step-notify-v1)
    -> Notification Service
    -> WebSocket/STOMP
    -> Admin Web
```

## 📊 Kết luận kiến trúc
Kiến trúc hiện tại cân bằng giữa:
- **Tốc độ phản hồi** cho nghiệp vụ thường xuyên.
- **Khả năng mở rộng** cho xử lý AI nặng.
- **Tính tách biệt trách nhiệm** theo domain và công nghệ.
