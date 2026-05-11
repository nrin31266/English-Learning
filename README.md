# English Learning Platform

Monorepo cho hệ thống học tiếng Anh theo hướng thực hành, cá nhân hóa và tự động hóa nội dung. Dự án hiện gồm 2 web app, 6 backend service Spring Boot, 1 AI service FastAPI, shared module và hạ tầng local bằng Docker.

## Tổng quan nhanh

- Tạo lesson từ audio/video và đẩy qua pipeline AI.
- Hỗ trợ luyện shadowing theo từng câu, chấm điểm theo từng từ và phoneme.
- Tra cứu và enrich từ vựng theo ngữ cảnh.
- Có tách riêng admin, learner, gateway, notification, discovery và AI processing.

## Thành phần chính

### Frontend

| Ứng dụng | Vai trò | Tech nổi bật |
|---|---|---|
| `learner-web` | Giao diện cho học viên: học lesson, luyện shadowing, tra từ vựng, nhận feedback | React 19, Vite, Redux Toolkit, Tailwind, Keycloak, Howler, STOMP |
| `admin-web` | Giao diện cho admin: quản lý nội dung, lesson, xuất bản và theo dõi dữ liệu | React 19, Vite, Redux Toolkit, Tailwind, Keycloak, TanStack Table |

### Backend microservices

| Service | Port | Vai trò |
|---|---|---|
| `api-gateway` | `8888` | Cổng vào của hệ thống, route request và WebSocket |
| `discovery-service` | `8761` | Eureka server cho service registry |
| `learning-content-service` | `8081` | CRUD lesson, orchestration pipeline tạo lesson, đẩy step update |
| `dictionary-service` | `8082` | Dữ liệu từ vựng, enrich dữ liệu, worker API |
| `user-service` | `8083` | User/profile, tích hợp auth qua Keycloak |
| `notification-service` | `8084` | Kafka consumer và WebSocket/STOMP notification |
| `language-processing-service` | `8089` | AI engine cho STT, NLP, TTS và job pipeline |

### Shared module

- `common`: module Java dùng chung cho DTO, helper, JSON schema và utility giữa các service backend.

### Hạ tầng local

`docker-compose.yml` đang dựng sẵn:

- PostgreSQL `5432`
- Keycloak `8080`
- Kafka `9092` và `29092`
- Zookeeper `2181`
- Kafka UI `9082`

Một số service hiện vẫn dùng thêm biến môi trường bên ngoài như Redis, MongoDB và Cloudinary, nên không phải toàn bộ hạ tầng đều nằm trong compose.

## Luồng nghiệp vụ chính

### 1. Shadowing cho học viên

1. Học viên mở lesson trong `learner-web`.
2. Frontend gọi `api-gateway`, sau đó đẩy audio sang `language-processing-service`.
3. AI service chạy WhisperX, alignment và scoring theo từng từ.
4. Hệ thống trả về trạng thái từ, score, phoneme diff và các chỉ số như `accuracy`, `weightedAccuracy`, `fluencyScore`.
5. UI highlight lỗi và phát feedback âm thanh để người học thử lại.

### 2. Tạo lesson và xử lý AI

1. Admin tạo lesson mới từ YouTube hoặc file audio trong `admin-web`.
2. `learning-content-service` ghi nhận job và đẩy bước xử lý qua Kafka.
3. `language-processing-service` xử lý STT, NLP, TTS và enrich dữ liệu.
4. `notification-service` phát thông tin realtime qua WebSocket để frontend cập nhật tiến trình.

### 3. Tra cứu từ vựng theo ngữ cảnh

1. Học viên bấm vào từ trong câu.
2. `dictionary-service` trả về dữ liệu ở trạng thái `READY`, `PROCESSING`, `FALLBACK` hoặc `FAILED`.
3. Dữ liệu được enrich dần bằng AI để bổ sung IPA, nghĩa, ví dụ và metadata liên quan.

## AI service

`language-processing-service` là FastAPI service trung tâm xử lý audio và ngôn ngữ. Nó có các router chính:

- `/speech-to-text`: transcribe audio và chấm shadowing.
- `/spacy`: phân tích ngữ pháp, lemma, POS, dependency và entity.
- `/tts`: sinh audio phát âm.
- `/ai-jobs`: quản lý job cho pipeline bất đồng bộ.

Các thành phần bên trong:

- `speech_to_text_service`: WhisperX, alignment và chuẩn hóa output.
- `shadowing_service`: so khớp expected words với recognized words, tính score dựa trên Levenshtein distance và IPA phoneme comparison.
- `spaCy_service`: phân tích NLP (lemma, POS, dependency).
- `gemini/`: enrich nội dung (IPA, translation, word analysis) qua Gemini API.
- `phoneme_ipa_service` & `phonemizer_service`: xử lý phoneme và IPA cho scoring.
- `word_processor` và `workers/word/word_worker.py`: xử lý pipeline từ vựng chạy nền.
- `redis`, `kafka`, `s3_storage`, `tts`: tích hợp hạ tầng và services.

## Prerequisites

- Java 21 cho các Spring Boot service.
- Node.js cho `admin-web` và `learner-web`.
- Python 3.11 cho `language-processing-service`.
- Docker và Docker Compose để chạy hạ tầng local.

## Chạy local

### 1. Khởi động hạ tầng

```bash
docker-compose up -d
```

### 2. Chạy backend Spring Boot

Mỗi service backend chạy trong thư mục tương ứng, ví dụ:

```bash
(cd api-gateway && ./mvnw spring-boot:run)
(cd discovery-service && ./mvnw spring-boot:run)
(cd learning-content-service && ./mvnw spring-boot:run)
(cd dictionary-service && ./mvnw spring-boot:run)
(cd user-service && ./mvnw spring-boot:run)
(cd notification-service && ./mvnw spring-boot:run)
```

### 3. Chạy AI service

```bash
cd language-processing-service
bash run.sh
```

File `run.sh` sẽ activate `lps-env` và chạy FastAPI trên port `8089`.

### 4. Chạy word workers

```bash
cd language-processing-service
bash run_word_worker.sh
```

Script sẽ hỏi số lượng worker cần chạy và ghi log vào `logs/`.

### 5. Chạy frontend

```bash
cd learner-web
npm install
npm run dev

cd ../admin-web
npm install
npm run dev
```

## Biến môi trường thường dùng

- `REDIS_URL`
- `MONGODB_URI`
- `KAFKA_BOOTSTRAP_SERVERS`
- `WORKER_API_KEY`
- thông tin Cloudinary / Google credentials cho AI service
- issuer Keycloak: `http://localhost:8080/realms/english-learning-realm`

## Ghi chú vận hành

- `api-gateway` đang route trực tiếp tới các service nội bộ, đồng thời có route WebSocket cho notification.
- `notification-service` dùng Kafka consumer và STOMP/WebSocket để đẩy realtime update.
- `common` là module chia sẻ cho backend, nên khi đổi DTO hoặc format JSON cần xem ảnh hưởng trên toàn bộ service.
- `kui/config.yml` dùng cho Kafka UI trong compose.

## Tài liệu liên quan

- `system-design/ai-service.md`
- `system-design/dev-commands.md`
- `system-design/decisions.md`
- `system-design/update_pronunciation_scroring.md`
