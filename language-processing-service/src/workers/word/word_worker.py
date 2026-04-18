import asyncio
import logging
import uuid
from src.client.dictionary_client import DictionaryClient
from src.services.word_processor import process_word_logic
from src.utils.text_utils import normalize_word_soft

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("WordWorker")

class WordWorker:
    def __init__(self):
        self.worker_id = f"word-worker-{uuid.uuid4().hex[:6]}"  # tăng entropy
        self.client = DictionaryClient()

    async def handle_job(self, job: dict):
        word_id = job["id"]  # ✅ nên lấy sẵn
        text = job["text"]
        key = job["key"]
        pos = job["pos"]

        try:
            result = await process_word_logic(
                text=normalize_word_soft(text),  # ✅ normalize nhẹ trước khi xử lý
                pos=pos,
                context=job.get("context", ""),
            )

            await self.client.report_success(key, pos, result)

            logger.info(f"✅ Successfully processed {key}_{pos}")

        except Exception as e:
            msg = str(e)

            if "429" in msg:
                logger.warning("⏳ Rate limit → sleep 10s")
                await asyncio.sleep(10)

            await self.client.report_fail(key, pos)

    async def run(self):
        logger.info(f"🚀 {self.worker_id} is starting...")
        try:
            while True:
                jobs = await self.client.claim_tasks(limit=5, worker_id=self.worker_id)

                if not jobs:
                    await asyncio.sleep(10)
                    continue

                logger.info(f"Processing {len(jobs)} words...")

                # ❗ chạy tuần tự
                for job in jobs:
                    await self.handle_job(job)
                    await asyncio.sleep(5)  # tránh quá tải, có thể điều chỉnh sau

                await asyncio.sleep(5)

        finally:
            await self.client.close()

if __name__ == "__main__":
    worker = WordWorker()
    asyncio.run(worker.run())