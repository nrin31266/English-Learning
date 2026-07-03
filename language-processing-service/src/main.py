from dotenv import load_dotenv

load_dotenv()

import asyncio
import gc
import logging
import os
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.discovery_client.eureka_config import register_with_eureka
from src.errors.base_exception import BaseException
from src.errors.base_exception_handler import (
    base_exception_handler,
    global_exception_handler,
    http_exception_handler,
)
from src.kafka.consumer.consumer import start_kafka_consumers
from src.kafka.producer import periodic_flush, producer
from src.redis.redis_client import redis_client
from src.routers import (
    ai_job_router,
    internal_router,
    spaCy_router,
    speech_to_text_router,
    tts_router,
)
from src.s3_storage.config import setup_cloudinary


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("language-processing-service")


ENABLE_EUREKA = os.getenv("ENABLE_EUREKA", "0") == "1"
ENABLE_KAFKA = os.getenv("ENABLE_KAFKA", "1") == "1"


def _cleanup_gpu_memory() -> None:
    gc.collect()

    if torch.cuda.is_available():
        torch.cuda.empty_cache()

        try:
            torch.cuda.ipc_collect()
        except Exception:
            pass


async def _cancel_task(task: asyncio.Task | None, name: str) -> None:
    if task is None:
        return

    task.cancel()

    try:
        await task
    except asyncio.CancelledError:
        logger.info("%s cancelled.", name)
    except Exception as e:
        logger.warning("%s stopped with error: %s", name, e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    kafka_task = None
    flush_task = None

    # ========== STARTUP ==========
    logger.info("Starting language-processing-service...")

    try:
        setup_cloudinary()
        logger.info("Cloudinary configured.")
    except Exception as e:
        logger.warning("Cloudinary setup failed: %s", e)

    try:
        logger.info("Connecting Redis...")
        await redis_client.ping()
        logger.info("Redis connected.")
    except Exception as e:
        logger.warning("Redis connection failed: %s", e)

    if ENABLE_EUREKA:
        try:
            await register_with_eureka()
            logger.info("Registered with Eureka.")
        except Exception as e:
            logger.warning("Eureka registration failed: %s", e)
    else:
        logger.info("Eureka registration skipped.")

    if ENABLE_KAFKA:
        try:
            kafka_task = asyncio.create_task(start_kafka_consumers())
            flush_task = asyncio.create_task(periodic_flush())
            logger.info("Kafka consumers started.")
        except Exception as e:
            logger.warning("Kafka startup failed: %s", e)
    else:
        logger.info("Kafka startup skipped.")

    yield

    # ========== SHUTDOWN ==========
    logger.info("Shutting down language-processing-service...")

    await _cancel_task(kafka_task, "Kafka consumer task")
    await _cancel_task(flush_task, "Kafka flush task")

    try:
        producer.flush(10)
        logger.info("Kafka producer flushed.")
    except Exception as e:
        logger.warning("Kafka producer flush failed: %s", e)

    try:
        import src.services.speech_to_text_service as stt_service

        stt_service.unload_whisperx()
        logger.info("WhisperX unloaded.")
    except Exception as e:
        logger.warning("WhisperX cleanup failed: %s", e)

    _cleanup_gpu_memory()
    logger.info("GPU memory cleaned.")


app = FastAPI(
    title="Language Processing Service",
    version="1.0.0",
    lifespan=lifespan,
)


cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(speech_to_text_router.router)
app.include_router(ai_job_router.router)
app.include_router(tts_router.router)
app.include_router(spaCy_router.router)
app.include_router(internal_router.router)


app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(BaseException, base_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)


@app.get("/health")
def health():
    return {"status": "UP"}


@app.get("/info")
def info():
    return {
        "service": "language-processing-service",
        "version": "1.0.0",
    }