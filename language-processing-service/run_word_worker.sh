#!/bin/bash

mkdir -p logs

echo "👉 Nhập số lượng Word Worker:"
read NUM_WORKERS

echo "🚀 Starting $NUM_WORKERS Word Workers..."

export PYTHONPATH=.

for ((i=1; i<=NUM_WORKERS; i++))
do
    echo "▶️ Starting Word Worker $i..."
    python -m src.workers.word.word_worker > logs/word_worker_$i.log 2>&1 &
done

echo "✅ All Word Workers started!"

# ⏳ chờ 1 chút để worker kịp ghi log
sleep 1

echo "📄 Showing logs for worker 1..."
tail -f logs/word_worker_1.log