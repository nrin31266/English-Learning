# 🧠 AI Service (Language Processing Service)

## 📌 Tổng quan

`Language Processing Service` (FastAPI) là AI engine trung tâm của hệ thống, chịu trách nhiệm:

- Xử lý **speech-to-text (STT)** cho shadowing và lesson generation  
- Phân tích **NLP** cho sentence và word  
- Tính toán **shadowing scoring** theo từng từ  
- Vận hành **worker nền** cho pipeline từ vựng  
- Tích hợp với **Kafka, Redis, Cloudinary**  

---

## 🧩 Kiến trúc module

### API Router chính

| Router | Vai trò |
|---|---|
| `/speech-to-text` | Upload audio, transcribe, chấm shadowing |
| `/spacy` | Phân tích ngữ pháp (lemma, POS, dependency) |
| `/tts` | Sinh audio phát âm |
| `/ai-jobs` | Tạo và quản lý `aiJobId` cho pipeline |

---

### Service nội bộ

| Service | Vai trò |
|---|---|
| `speech_to_text_service` | WhisperX transcribe + word alignment |
| `shadowing_service` | So khớp expected/actual, tính điểm |
| `gemini/analyzer` | NLP sentence batch + word enrichment |
| `media_service` | Tải audio từ YouTube/file |
| `word_processor` | Pipeline xử lý từ (NLP → TTS → upload) |

---

## 🎙️ Speech-to-Text

- Công nghệ: **WhisperX + librosa + torch**
- Output chuẩn hóa:
  - `language`
  - `segments`
  - `words` (có timestamp)

### Vai trò

- Input cho:
  - Shadowing scoring  
  - Pipeline tạo lesson  
- Đảm bảo:
  - Word-level alignment (rất quan trọng cho scoring)

---

## 🎯 Shadowing Scoring

### 1. Alignment (DP)

- Sử dụng **Dynamic Programming**
- So khớp:
  - `expectedWords` vs `recognizedWords`
- Giải quyết:
  - Thừa từ
  - Thiếu từ
  - Tránh lệch dây chuyền

---

### 2. Word Classification

Mỗi từ được classify:


CORRECT / NEAR / WRONG / MISSING / EXTRA


---

### 3. Phoneme / IPA Analysis with CMU

- Với `NEAR` / `WRONG`:
  - So sánh IPA expected vs actual
  - Trả về:
    - `phonemeDiff`
    - score theo phoneme
- Với `EXTRA / MISSING`:
  - Trả IPA để UI giải thích

---

### 4. Sentence-level Metrics

- `accuracy`
- `weightedAccuracy` (có penalty cho extra/missing)
- `fluencyScore`
- `speechRate`, `avgPause`

---

### 👉 Output trả về cho frontend

- Danh sách word + trạng thái
- Điểm tổng
- Metadata phục vụ highlight UI

---

## 🔄 Flow Shadowing (thực tế)


Frontend (record audio)
→ API Gateway
→ /speech-to-text/transcribe
→ WhisperX
→ Alignment + Scoring
→ Response (JSON)
→ UI render + feedback sound


---

## 🔍 NLP (spaCy + Gemini)

### spaCy

- Phân tích:
  - lemma
  - POS
  - dependency
  - entity
- Dùng để:
  - Validate word hợp lệ
  - Chuẩn hóa dữ liệu

---

### Gemini

- Sentence:
  - Dịch nghĩa
  - Phân tích ngữ cảnh
- Word:
  - `isValid`
  - CEFR
  - definitions
  - phonetics
- Output luôn ở dạng **JSON** để map DTO ổn định

---

## 🚀 Kafka Consumer Pipeline

### Consume

- Topic: `lesson-generation-requested-v1`

### Flow


Fetch audio
→ Transcribe
→ NLP analyze
→ Publish step update


### Publish

- `lesson-processing-step-updated-v1`

---

## ⚙️ Worker xử lý từ vựng

- Chạy như process riêng (`WordWorker`)
- Poll Dictionary Service để lấy job
- Xử lý tuần tự từng từ:


Analyze → Generate TTS → Upload → Save result


### Đặc điểm

- Batch claim theo `worker_id`
- Retry khi lỗi
- Handle rate limit (`429`)
- Tránh overload model/API

---

## 🧮 Redis Usage

- Lưu trạng thái **cancel AI job**

### Key


aiJobStatus:{aiJobId}


### Cách hoạt động

- Learning Content Service set `CANCELLED`
- AI Service check trước/sau mỗi bước
- Dừng pipeline sớm → tiết kiệm tài nguyên

---

## ☁️ Cloudinary Storage

Lưu:

- Audio lesson
- Audio