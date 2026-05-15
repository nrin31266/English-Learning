# ⚙️ Dev Commands Cheatsheet

Tổng hợp các lệnh thường dùng khi phát triển và vận hành hệ thống.

---

## 🐳 Docker

```bash
# Build và chạy toàn bộ service
docker-compose up --build

# Chạy nền
docker-compose up -d

# Dừng
docker-compose down

# Xem log
docker-compose logs -f
☕ Backend (Spring Boot)
# Chạy service
./mvnw spring-boot:run

# Build jar
./mvnw clean package

# Chạy jar
java -jar target/app.jar
🐍 AI Service (FastAPI)
# Tạo virtual env
python3 -m venv venv

# Activate
source venv/bin/activate

# Install deps
pip install -r requirements.txt

# Run server
uvicorn src.main:app --host 0.0.0.0 --port 8089 --reload
🧠 Worker (Word Processor)
# Chạy worker
python src/workers/word_worker.py

# Xem log realtime
tail -f logs/word_worker_1.log

# Xem 50 dòng cuối
tail -n 50 logs/word_worker_1.log

# Tìm process
pgrep -af word_worker

# Kill worker
pkill -f word_worker
📦 Kafka
# List topic
kafka-topics.sh --list --bootstrap-server localhost:9092

# Consume
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic lesson-generation-requested-v1 \
  --from-beginning

# Produce test
kafka-console-producer.sh \
  --broker-list localhost:9092 \
  --topic lesson-generation-requested-v1
🧮 Redis
# Connect
redis-cli

# Set key
SET aiJobStatus:123 CANCELLED

# Get key
GET aiJobStatus:123

# Monitor realtime
MONITOR
🌿 Git
# Tạo branch mới
git checkout -b feature/xyz

# Add + commit
git add .
git commit -m "feat: ..."

# Push
git push origin feature/xyz

# Xóa branch local
git branch -d feature/xyz

# Xóa branch remote
git push origin --delete feature/xyz
🧪 Debug nhanh
# Check port đang dùng
lsof -i :8089

# Kill port
kill -9 <PID>

# Check process
ps aux | grep python
📌 Ghi chú
Các lệnh trên phục vụ:
Dev local
Debug nhanh
Test pipeline AI
Có thể mở rộng thêm:
CI/CD
Kubernetes
Monitoring (Prometheus, Grafana)
Lệnh chạy theo hướng mới:

python src/scripts/quicktest.py --status READY --strict-only --used-only --out bad_core_used.json

Audit chất lượng, bỏ INFO:

python src/scripts/quicktest.py --status READY --used-only --ignore-info --out quality_used.json

Muốn xem lại kiểu fill blank cũ thì mới bật:

python src/scripts/quicktest.py --status READY --used-only --fill-blank-check --out fillblank_legacy_report.json