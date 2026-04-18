from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from src.tts.tts_service import generate_audio
import io

router = APIRouter(prefix="/tts", tags=["Text-To-Speech"])

