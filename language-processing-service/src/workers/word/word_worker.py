import asyncio
import logging
import os
import sys
import uuid
import src.client.mongo_word_repository as mongo_repo
from src.llm.analyzer import analyze_words_batch
from src.services.word_processor import process_word_logic
from src.utils.text_utils import normalize_word_soft

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("WordWorker")

BATCH_SIZE = 5


class WordWorker:
    def __init__(self):
        self.worker_id = f"word-worker-{uuid.uuid4().hex[:6]}"

    async def handle_batch(self, jobs: list[dict]):
        """
        1. One AI call → analyze all words in batch
        2. For each result: TTS + upload sequentially, then persist
        """
        words_input = [
            {
                "word": normalize_word_soft(job["text"]) or job["text"],
                "pos": job["pos"],
            }
            for job in jobs
        ]

        try:
            results = await analyze_words_batch(words_input)
        except Exception as e:
            msg = str(e)
            logger.error(f"❌ Batch AI failed: {msg}")
            if "429" in msg:
                logger.warning("⏳ Rate limit → sleep 30s")
                await asyncio.sleep(30)
            for job in jobs:
                await mongo_repo.report_fail(job["key"], job["pos"])
            return

        for job, ai_result in zip(jobs, results):
            key = job["key"]
            pos = job["pos"]
            text = normalize_word_soft(job["text"]) or job["text"]
            try:
                if not ai_result.get("isValid", False):
                    logger.info(f"[INVALID] {key}_{pos}")
                    await mongo_repo.report_success(key, pos, ai_result)
                    await mongo_repo.on_word_ready(key, pos)
                    continue

                # TTS + upload using existing pipeline (skip re-analysis)
                final_result = await process_word_logic(
                    text=text, pos=pos, context=job.get("context", ""),
                    _ai_result=ai_result,
                )
                await mongo_repo.report_success(key, pos, final_result)
                await mongo_repo.on_word_ready(key, pos)
                logger.info(f"✅ {key}_{pos}")
                await asyncio.sleep(1)

            except Exception as e:
                msg = str(e)
                logger.error(f"❌ Post-AI processing failed for {key}_{pos}: {msg}")
                if "429" in msg:
                    await asyncio.sleep(10)
                await mongo_repo.report_fail(key, pos)

    async def run(self):
        logger.info(f"🚀 {self.worker_id} starting (batch_size={BATCH_SIZE})...")
        try:
            while True:
                jobs = await mongo_repo.claim_tasks(limit=BATCH_SIZE, worker_id=self.worker_id)

                if not jobs:
                    await asyncio.sleep(10)
                    continue

                logger.info(f"📦 Claimed {len(jobs)} words for batch processing")
                await self.handle_batch(jobs)
                await asyncio.sleep(3)

        finally:
            await mongo_repo.close()


if __name__ == "__main__":
    worker = WordWorker()
    asyncio.run(worker.run())