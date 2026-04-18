# 🧠 AI Service (Language Processing Service)

## 📌 Tổng quan
`Language Processing Service` (FastAPI) là AI engine trung tâm của hệ thống, chịu trách nhiệm:
- Xử lý **speech-to-text** cho shadowing và lesson generation.
- Phân tích **NLP** cho sentence/word.
- Vận hành **worker nền** cho pipeline từ vựng.
- Tích hợp với **Kafka**, **Redis** và **Cloudinary**.

## 🧩 Kiến trúc module

### API Router chính

| Router | Vai trò |
|---|---|
| `/speech-to-text` | Upload audio, transcribe, chấm shadowing |
| `/spacy` | Phân tích từ theo ngữ cảnh (lemma, POS, tag, dep) |
| `/tts` | Sinh audio phát âm |
| `/ai-jobs` | Tạo `aiJobId` cho pipeline lesson generation |

### Service nội bộ

| Service | Vai trò |
|---|---|
| `speech_to_text_service` | WhisperX transcribe + align, lazy-load model |
| `shadowing_service` | So khớp expected/recognized, tính điểm chính xác |
| `gemini/analyzer` | NLP sentence batch và word enrichment |
| `media_service` | Tải audio từ YouTube/file nguồn |
| `word_processor` | Pipeline word: analyze -> TTS -> upload |

## 🎙️ Speech-to-Text
- Công nghệ: **WhisperX + librosa + torch**.
- Đầu ra chuẩn hóa:
  - `language`
  - `segments`
  - `words` có timestamp
- Ứng dụng:
  - Chấm shadowing theo từng từ.
  - Làm dữ liệu đầu vào tạo sentence/word metadata cho lesson.

## 🔍 NLP (spaCy + Gemini)

### spaCy
- Phân tích hình thái và ngữ pháp từ trong ngữ cảnh:
  - lemma, POS, tag, dependency, entity.
- Dùng để validate từ hợp lệ trước khi đẩy vào pipeline dictionary.

### Gemini
- Phân tích sentence theo batch:
  - dịch nghĩa, phiên âm, enrichment metadata.
- Phân tích word:
  - `isValid`, CEFR, definitions, phonetics, summary.
- Mô hình được cấu hình trả về **JSON format** để map DTO ổn định.

## 🚀 Kafka Consumer Pipeline
- Topic consume:
  - `lesson-generation-requested-v1`
- Handler chính:
  - `handle_lesson_generation_requested`
- Chuỗi xử lý:
  - tải audio -> transcribe -> NLP -> publish step update
- Topic publish:
  - `lesson-processing-step-updated-v1`

## ⚙️ Worker xử lý từ vựng
- `WordWorker` chạy như process riêng, polling Dictionary internal API.
- Claim job theo batch bằng `worker_id`.
- Xử lý tuần tự từng từ để giảm rủi ro quá tải model/API.
- Có cơ chế chờ khi gặp giới hạn tốc độ (`429`).
- Report kết quả thành công/thất bại về Dictionary Service.

## 🧮 Redis Usage
- Mục đích chính: lưu trạng thái **hủy AI job**.
- Key pattern:
  - `aiJobStatus:{aiJobId}`
- Learning Content Service set `CANCELLED` khi người dùng hủy job.
- LPS kiểm tra key trước/sau các bước để dừng pipeline sớm, tránh tốn tài nguyên.

## ☁️ Cloudinary Storage
- Lưu trữ artifact AI phục vụ học tập và tái sử dụng dữ liệu:
  - Audio lesson đã xử lý.
  - Metadata JSON của lesson.
  - Audio phát âm UK/US cho từ vựng.

### API upload chính
- `upload_file`: upload audio/video resource.
- `upload_json_content`: upload metadata dạng raw JSON.

## 📊 Tóm tắt quyết định kỹ thuật trong AI Service

| Thành phần | Lý do chọn |
|---|---|
| WhisperX | Có word-level timestamp, phù hợp chấm shadowing |
| spaCy | Nhanh, ổn định cho xử lý ngữ pháp từ |
| Gemini | Mạnh trong semantic enrichment cho sentence/word |
| Kafka | Tách xử lý nặng khỏi request đồng bộ |
| Redis | Kiểm soát trạng thái hủy job tức thời |
| Cloudinary | Lưu trữ media/metadata tập trung, dễ tích hợp |

##Quản lý worker logs
# Xem realtime
tail -f logs/word_worker_1.log

# Xem toàn bộ log
cat logs/word_worker_1.log

# Xem 50 dòng cuối
tail -n 50 logs/word_worker_1.log

# Kiểm tra worker đang chạy
pgrep -af word_worker

# Dừng tất cả worker
pkill -f word_worker
