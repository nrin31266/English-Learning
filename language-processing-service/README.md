# Language Processing Service

`language-processing-service` là AI service trung tâm của hệ thống, được triển khai bằng FastAPI.

## Trách nhiệm chính

- Speech-to-text cho shadowing và pipeline tạo lesson.
- Shadowing scoring theo word/phoneme.
- NLP với spaCy và Gemini.
- Text-to-speech.
- Worker xử lý từ vựng nền.
- Tích hợp Kafka, Redis, Cloudinary và Eureka.

## API chính

- `/speech-to-text`: transcribe audio và trả kết quả chấm shadowing.
- `/spacy`: phân tích ngữ pháp và NLP.
- `/tts`: sinh audio phát âm.
- `/ai-jobs`: quản lý job pipeline bất đồng bộ.

## Cấu trúc nội bộ

- `src/main.py`: entrypoint FastAPI.
- `src/routers/`: định nghĩa các API router.
- `src/services/`: logic STT, scoring, TTS, NLP, media, phoneme.
- `src/workers/word/word_worker.py`: worker xử lý từ vựng.
- `src/kafka/`, `src/redis/`, `src/s3_storage/`, `src/discovery_client/`: các tích hợp hạ tầng.

## Chạy local

```bash
cd language-processing-service
bash run.sh
```

Script sẽ activate `lps-env` và chạy FastAPI trên port `8089`.

### Chạy worker từ vựng

```bash
cd language-processing-service
bash run_word_worker.sh
```

Script sẽ hỏi số lượng worker cần chạy và ghi log vào `logs/`.

## Kiểm thử nhanh

Thư mục `test_script/` chứa các bộ mock test cho từng bước của shadowing pipeline:

- alignment
- extra penalty
- fluency
- phoneme
- feedback

## Biến môi trường thường dùng

- `KAFKA_BOOTSTRAP_SERVERS`
- `REDIS_URL`
- `WORKER_API_KEY`
- thông tin Cloudinary
- thông tin Gemini / Google Cloud cho TTS và enrichment
