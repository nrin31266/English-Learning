import logging

import httpx
import os
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("DictionaryClient")

class DictionaryClient:
    def __init__(self):
        base = os.getenv("DICTIONARY_SERVICE_URL", "http://localhost:8080")
        self.base_url = f"{base}/internal/words"

        self.api_key = os.getenv("WORKER_API_KEY", "16092005")

        self.client = httpx.AsyncClient(
            headers={"X-Worker-Key": self.api_key},  # ✅ FIX
            timeout=30.0
        )

    async def claim_tasks(self, limit: int, worker_id: str):
        resp = await self.client.post(
            f"{self.base_url}/claim",
            params={"limit": limit, "workerId": worker_id}
        )
        resp.raise_for_status()

        data = resp.json()
        return data.get("result", []) or []

    async def report_success(self, key: str, pos: str, result_data: dict):
        logger.info(f"✅ Successfully processed {key}_{pos}")
        resp = await self.client.post(
            f"{self.base_url}/success",
            params={"key": key, "pos": pos},
            json=result_data
        )
        resp.raise_for_status()

    async def report_fail(self, key: str, pos: str):
        logger.warning(f"❌ Failed to process {key}_{pos}")
        resp = await self.client.post(
            f"{self.base_url}/fail",
            params={"key": key, "pos": pos}
        )
        resp.raise_for_status()

    async def close(self):
        await self.client.aclose()