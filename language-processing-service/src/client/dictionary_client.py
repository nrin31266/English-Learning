import httpx
import os
from dotenv import load_dotenv

load_dotenv()


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

    async def report_success(self, text_lower: str, pos: str, result_data: dict):
        resp = await self.client.post(
            f"{self.base_url}/success",
            params={"textLower": text_lower, "pos": pos},
            json=result_data
        )
        resp.raise_for_status()

    async def report_fail(self, word_id: str):
        resp = await self.client.post(
            f"{self.base_url}/fail",
            params={"wordId": word_id}
        )
        resp.raise_for_status()

    async def close(self):
        await self.client.aclose()