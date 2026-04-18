from dotenv import load_dotenv
load_dotenv()

import logging
import asyncio
import gc
import torch
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.errors.base_exception_handler import (
    base_exception_handler, global_exception_handler, http_exception_handler
)
from src.errors.base_exception import BaseException
from src.discovery_client.eureka_config import register_with_eureka
from src.kafka.consumer.consumer import start_kafka_consumers
from src.kafka.producer import periodic_flush, producer
from src.s3_storage.config import setup_cloudinary
from src.redis.redis_client import redis_client
from src.routers import spaCy_router, tts_router, ai_job_router, speech_to_text_router

# LOGGING CONFIG
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ========== STARTUP ==========
    setup_cloudinary()
    
    print("Connecting Redis...")
    try:
        await redis_client.ping()
        print("✅ Redis connected")
    except Exception as e:
        print("❌ Redis connection failed:", e)
    
    # await register_with_eureka()
    print("✅ Registered with Eureka")
    
    # KAFKA CONSUMERS
    kafka_task = asyncio.create_task(start_kafka_consumers())
    flush_task = asyncio.create_task(periodic_flush())
    print("✅ Kafka consumers started")
    

    
    yield  # APP RUNNING

    # ========== SHUTDOWN ==========
    print("Shutting down FastAPI...")
    
    # STOP KAFKA
    kafka_task.cancel()
    flush_task.cancel()
    try:
        await kafka_task
        await flush_task
    except asyncio.CancelledError:
        pass
    producer.flush(10)
    
    # CLEANUP GPU MEMORY
    print("Cleaning WhisperX & GPU memory...")
    import src.services.speech_to_text_service as stt_service
    stt_service.unload_whisperx()

    try:
        del whisper_model
    except:
        pass

    try:
        from whisperx import alignment
        alignment.alignment_model = None
    except:
        pass

    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()
    print("✅ WhisperX model unloaded & GPU memory cleaned.")


# ========== FASTAPI APP ==========
app = FastAPI(title="FastAPI Service", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTERS
app.include_router(speech_to_text_router.router)
app.include_router(ai_job_router.router)
app.include_router(tts_router.router)
app.include_router(spaCy_router.router)

# EXCEPTION HANDLERS
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(BaseException, base_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)


# ========== HEALTH CHECKS ==========
@app.get("/health")
def health():
    return {"status": "UP"}

@app.get("/info")
def info():
    return {"service": "lps-service", "version": "1.0.0"}