import logging
import os
import requests
import asyncio
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, ReturnDocument

load_dotenv()

logger = logging.getLogger("MongoWordRepository")

MAX_RETRY = 5

_client: Optional[AsyncIOMotorClient] = None


def _get_collection():
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        _client = AsyncIOMotorClient(uri)
    db_name = os.getenv("MONGODB_DB", "dictionary_db")
    return _client[db_name]["words"]


async def claim_tasks(limit: int, worker_id: str) -> list:
    col = _get_collection()
    results = []
    for _ in range(limit):
        doc = await col.find_one_and_update(
            {"status": "PENDING", "retryCount": {"$lt": MAX_RETRY}},
            {
                "$set": {
                    "status": "PROCESSING",
                    "processingStartedAt": datetime.now(tz=timezone.utc),
                    "lockedBy": worker_id,
                },
                "$inc": {"retryCount": 1},
            },
            sort=[("createdAt", ASCENDING)],
            return_document=ReturnDocument.AFTER,
        )
        if doc is None:
            break
        results.append(doc)
    return results


async def report_success(key: str, pos: str, result_data: dict) -> None:
    col = _get_collection()
    await col.update_one(
        {"key": key, "pos": pos},
        {
            "$set": {
                "status": "READY",
                "summaryVi": result_data.get("summaryVi", ""),
                "cefrLevel": result_data.get("cefrLevel"),
                "phonetics": result_data.get("phonetics", {}),
                "definitions": result_data.get("definitions", []),
                "isPhrase": bool(result_data.get("isPhrase", False)),
                "phraseType": result_data.get("phraseType", "") or "",
                "lockedBy": None,
                "updatedAt": datetime.now(tz=timezone.utc),
            }
        },
    )
    logger.info(f"[READY] {key}_{pos}")


async def report_fail(key: str, pos: str) -> None:
    col = _get_collection()
    doc = await col.find_one({"key": key, "pos": pos}, {"retryCount": 1})
    retry = doc.get("retryCount", 0) if doc else 0
    new_status = "FAILED" if retry >= MAX_RETRY else "PENDING"
    await col.update_one(
        {"key": key, "pos": pos},
        {
            "$set": {
                "status": new_status,
                "lockedBy": None,
                "lastRetryAt": datetime.now(tz=timezone.utc),
            }
        },
    )
    logger.warning(f"[{new_status}] {key}_{pos} (retry={retry})")


async def on_word_ready(key: str, pos: str) -> None:
    """
    Thông báo cho Java Backend rằng từ đã xử lý xong.
    Java sẽ lo việc cập nhật tiến độ Subtopic và bắn tin qua WebSocket/Kafka.
    """
    # Lấy URL của Dictionary Service từ .env
    api_url = os.getenv("DICTIONARY_SERVICE_URL", "http://localhost:8082")
    endpoint = f"{api_url}/api/internal/vocab/words-ready"
    
    # Lấy Worker API Key từ .env (phải giống với worker.api-key bên Java)
    worker_key = os.getenv("WORKER_API_KEY", "16092005")
    
    payload = {
        "wordKey": key,
        "pos": pos
    }

    # BẮT BUỘC: Truyền X-Worker-Key vào Headers để pass qua Filter của Java
    headers = {
        "X-Worker-Key": worker_key,
        "Content-Type": "application/json"
    }

    try:
        # Nhớ thêm headers=headers vào hàm requests.post
        response = await asyncio.to_thread(
            requests.post, 
            endpoint, 
            json=payload, 
            headers=headers, 
            timeout=5
        )
        
        if response.status_code in (200, 201, 202):
            logger.info(f"🚀 [Notify Java] Gửi tín hiệu READY thành công cho {key}_{pos}")
        else:
            logger.error(f"⚠️ [Notify Java] Java Backend trả về lỗi {response.status_code} cho {key}_{pos}")
            
    except Exception as e:
        logger.error(f"❌ [Notify Java] Không thể kết nối tới Dictionary Service: {str(e)}")

async def close() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None