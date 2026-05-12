import logging
import os
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
    col = _get_collection()
    db_name = os.getenv("MONGODB_DB", "dictionary_db")
    db = _client[db_name]

    # 1. Mark all VocabWordEntry linked to this word as ready
    entry_col = db["vocab_word_entries"]
    result = await entry_col.update_many(
        {"wordKey": key, "pos": pos, "wordReady": False},
        {"$set": {"wordReady": True}},
    )

    if result.modified_count == 0:
        return

    logger.info(f"[VocabWordEntry] Marked {result.modified_count} entries ready for {key}_{pos}")

    # 2. Find distinct subtopicIds affected and check completion
    affected = await entry_col.distinct("subtopicId", {"wordKey": key, "pos": pos})
    for subtopic_id in affected:
        await _check_subtopic_completion(db, subtopic_id)


async def _check_subtopic_completion(db, subtopic_id: str) -> None:
    subtopic_col = db["vocab_subtopics"]
    entry_col = db["vocab_word_entries"]
    topic_col = db["vocab_topics"]

    subtopic = await subtopic_col.find_one({"_id": subtopic_id})
    if not subtopic or subtopic.get("status") == "READY":
        return

    ready_count = await entry_col.count_documents({"subtopicId": subtopic_id, "wordReady": True})
    word_count = subtopic.get("wordCount", 0)

    update = {"$set": {"readyWordCount": ready_count, "updatedAt": datetime.now(tz=timezone.utc)}}

    if word_count > 0 and ready_count >= word_count:
        update["$set"]["status"] = "READY"
        await subtopic_col.update_one({"_id": subtopic_id}, update)
        logger.info(f"[VocabSubTopic] READY: {subtopic_id}")
        await _check_topic_completion(db, subtopic)
    else:
        await subtopic_col.update_one({"_id": subtopic_id}, update)


async def _check_topic_completion(db, subtopic: dict) -> None:
    topic_id = subtopic.get("topicId")
    if not topic_id:
        return

    topic_col = db["vocab_topics"]
    subtopic_col = db["vocab_subtopics"]

    topic = await topic_col.find_one({"_id": topic_id})
    if not topic:
        return

    ready_subtopics = await subtopic_col.count_documents({"topicId": topic_id, "status": "READY"})
    subtopic_count = topic.get("subtopicCount", 0)
    topic_ready = subtopic_count > 0 and ready_subtopics >= subtopic_count

    new_status = "READY" if topic_ready else "PROCESSING"
    await topic_col.update_one(
        {"_id": topic_id},
        {"$set": {"status": new_status, "readySubtopicCount": ready_subtopics,
                  "updatedAt": datetime.now(tz=timezone.utc)}},
    )
    if topic_ready:
        logger.info(f"[VocabTopic] READY: {topic_id}")


async def close() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
