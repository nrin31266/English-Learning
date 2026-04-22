import asyncio
import os
import functools # Thêm cái này

import librosa
import torch
import whisperx

# ==============================================================================
# MONKEY PATCH: Sửa lỗi "Weights only load failed" của PyTorch 2.6/2.8
# ==============================================================================
original_load = torch.load

@functools.wraps(original_load)
def patched_load(*args, **kwargs):
    # Ép buộc weights_only luôn là False để load được model Pyannote/WhisperX
    if 'weights_only' in kwargs:
        kwargs['weights_only'] = False
    return original_load(*args, **kwargs)

torch.load = patched_load
# ==============================================================================

from src.errors.base_exception import BaseException
from src.errors.base_error_code import BaseErrorCode

# ... (Giữ nguyên các phần khai báo CONFIG bên dưới)
ENABLE_WHISPERX = os.getenv("ENABLE_WHISPERX", "1") == "1"

device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "float32"

whisper_model = None
_align_model_cache: dict[str, tuple[object, dict]] = {}

def _ensure_whisper_model_loaded():
    global whisper_model
    if not ENABLE_WHISPERX:
        raise BaseException(
            BaseErrorCode.INVALID_REQUEST,
            "WhisperX is disabled.",
        )

    if whisper_model is None:
        print(f"[WhisperX] Loading ASR model (base.en) on {device} ({compute_type})...")
        with torch.no_grad():
            # Lúc này khi whisperx gọi load_model, nó sẽ dùng hàm patched_load ở trên
            whisper_model = whisperx.load_model(
                "base.en",
                device=device,
                compute_type=compute_type,
            )
        print("✅ [WhisperX] ASR model loaded successfully!")

def unload_whisperx():
    global whisper_model
    whisper_model = None
    _align_model_cache.clear()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

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

def _get_audio_duration_sync(path: str) -> float:
    if not os.path.exists(path):
        raise BaseException(BaseErrorCode.NOT_FOUND, f"File not found: {path}")
    try:
        y, sr = librosa.load(path, sr=None)
        return librosa.get_duration(y=y, sr=sr)
    except Exception:
        raise BaseException(BaseErrorCode.INVALID_AUDIO_FILE, f"Invalid audio file: {path}")

def _transcribe_sync(audio_path: str):
    _ensure_whisper_model_loaded()
    try:
        with torch.no_grad():
            result = whisper_model.transcribe(audio_path, batch_size=4)
    except IndexError:
        # WhisperX đôi khi ném IndexError khi VAD không tìm thấy speech.
        return {
            "text": "",
            "segments": [],
            "language": "en",
            "error": "NO_SPEECH",
            "message": "Khong phat hien giong noi. Hay kiem tra microphone.",
        }

    segments = result.get("segments") or []
    if not segments:
        return {
            "text": "",
            "segments": [],
            "language": result.get("language") or "en",
            "error": "NO_SPEECH",
            "message": "Khong phat hien giong noi. Hay kiem tra microphone.",
        }

    with torch.no_grad():
        language_code = result.get("language") or "en"
        align_model, metadata = _get_align_model(language_code)
        aligned = whisperx.align(
            segments,
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