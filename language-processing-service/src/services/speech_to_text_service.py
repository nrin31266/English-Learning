import asyncio
import os

import librosa
import torch
import whisperx

from src.errors.base_exception import BaseException
from src.errors.base_error_code import BaseErrorCode

# =========================
# CONFIG
# =========================
ENABLE_WHISPERX = os.getenv("ENABLE_WHISPERX", "1") == "1"  # 1=bật, 0=tắt

device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "float32"

# Model sẽ chỉ load khi cần
whisper_model = None

# Align model cache (per language)
_align_model_cache: dict[str, tuple[object, dict]] = {}


# MODEL LOAD 
def _ensure_whisper_model_loaded():
    global whisper_model

    if not ENABLE_WHISPERX:
        raise BaseException(
            BaseErrorCode.INVALID_REQUEST,
            "WhisperX is disabled (set ENABLE_WHISPERX=1 to enable).",
        )

    if whisper_model is None:
        print(f"[WhisperX] Loading ASR model (base.en) on {device} ({compute_type})...")
        with torch.no_grad():
            whisper_model = whisperx.load_model(
                "base.en",
                device=device,
                compute_type=compute_type,
            )
        print("✅ [WhisperX] ASR model loaded successfully!")
# UNLOAD MODEL
def unload_whisperx():
    global whisper_model
    whisper_model = None
    _align_model_cache.clear()

    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()


# GET ALIGN MODEL (WITH CACHING)
def _get_align_model(language_code: str) -> tuple[object, dict]:
    if not language_code:
        language_code = "en"

    if language_code in _align_model_cache:
        return _align_model_cache[language_code]

    print(f"[WhisperX] Loading align model for language={language_code} on {device}...")
    with torch.no_grad():
        align_model, metadata = whisperx.load_align_model(
            language_code=language_code,
            device=device,
        )
    _align_model_cache[language_code] = (align_model, metadata)
    print(f"✅ [WhisperX] Align model for {language_code} loaded & cached.")
    return align_model, metadata


# UTILS
def _get_audio_duration_sync(path: str) -> float:
    if not os.path.exists(path):
        raise BaseException(BaseErrorCode.NOT_FOUND, f"File not found: {path}")
    try:
        y, sr = librosa.load(path, sr=None)
        return librosa.get_duration(y=y, sr=sr)
    except Exception:
        raise BaseException(
            BaseErrorCode.INVALID_AUDIO_FILE,
            f"Invalid audio file: {path}",
        )


def _transcribe_sync(audio_path: str):
    _ensure_whisper_model_loaded()

    with torch.no_grad():
        result = whisper_model.transcribe(audio_path, batch_size=4)

        language_code = result.get("language") or "en"
        align_model, metadata = _get_align_model(language_code)

        aligned = whisperx.align(
            result["segments"],
            align_model,
            metadata,
            audio_path,
            device,
        )

    if isinstance(aligned, dict):
        aligned.pop("word_segments", None)

    return aligned



async def get_audio_duration(path: str) -> float:
    return await asyncio.to_thread(_get_audio_duration_sync, path)


async def transcribe(audio_path: str):
    return await asyncio.to_thread(_transcribe_sync, audio_path)
