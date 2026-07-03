import asyncio
from asyncio.log import logger
import os
import functools
import warnings
import librosa
from pydantic import json
import torch
import whisperx
import subprocess
try:
    import soundfile as sf
except Exception:
    sf = None

# ==============================================================================
# MONKEY PATCH: Sửa lỗi "Weights only load failed" của PyTorch 2.6/2.8
# ==============================================================================
original_load = torch.load

@functools.wraps(original_load)
def patched_load(*args, **kwargs):
    # Ép weights_only=False để load được model Pyannote/WhisperX cũ
    kwargs["weights_only"] = False
    return original_load(*args, **kwargs)

torch.load = patched_load
# ==============================================================================

from src.errors.base_exception import BaseException
from src.errors.base_error_code import BaseErrorCode


ENABLE_WHISPERX = os.getenv("ENABLE_WHISPERX", "1") == "1"

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base.en")
WHISPER_BATCH_SIZE = int(os.getenv("WHISPER_BATCH_SIZE", "1"))
MAX_CONCURRENT_TRANSCRIBE = int(os.getenv("MAX_CONCURRENT_TRANSCRIBE", "1"))
DROP_WORD_SEGMENTS = os.getenv("DROP_WORD_SEGMENTS", "1") == "1"

device = "cuda" if torch.cuda.is_available() else "cpu"

if device == "cuda":
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "float16")
else:
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

whisper_model = None
_align_model_cache: dict[str, tuple[object, dict]] = {}
_transcribe_semaphore = asyncio.Semaphore(MAX_CONCURRENT_TRANSCRIBE)


def _no_speech_response(language: str = "en"):
    return {
        "text": "",
        "segments": [],
        "language": language or "en",
        "error": "NO_SPEECH",
        "message": "No speech detected in the audio.",
    }


def _clear_cuda_cache():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        try:
            torch.cuda.ipc_collect()
        except Exception:
            pass


def _ensure_whisper_model_loaded():
    global whisper_model

    if not ENABLE_WHISPERX:
        raise BaseException(
            BaseErrorCode.INVALID_REQUEST,
            "WhisperX is disabled.",
        )

    if whisper_model is None:
        logger.info("[WhisperX] Loading ASR model | model=%s | device=%s | compute_type=%s", WHISPER_MODEL, device, compute_type)
        try:
            with torch.no_grad():
                whisper_model = whisperx.load_model(
                    WHISPER_MODEL,
                    device=device,
                    compute_type=compute_type,
                )
            logger.info("[WhisperX] ASR model loaded")
        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                _clear_cuda_cache()
                raise BaseException(
                    BaseErrorCode.INTERNAL_SERVER_ERROR,
                    "WhisperX does not have enough RAM/VRAM to load the model.",
                )
            raise


def unload_whisperx():
    global whisper_model

    whisper_model = None
    _align_model_cache.clear()
    _clear_cuda_cache()


def _get_align_model(language_code: str) -> tuple[object, dict]:
    if not language_code:
        language_code = "en"

    if language_code in _align_model_cache:
        return _align_model_cache[language_code]

    logger.info("[WhisperX] Loading align model | language=%s | device=%s", language_code, device)
    try:
        with torch.no_grad():
            align_model, metadata = whisperx.load_align_model(
                language_code=language_code,
                device=device,
            )
        _align_model_cache[language_code] = (align_model, metadata)
        logger.info("[WhisperX] Align model for %s loaded & cached.", language_code)
        return align_model, metadata
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            _clear_cuda_cache()
            raise BaseException(
                BaseErrorCode.INTERNAL_SERVER_ERROR,
                "WhisperX does not have enough RAM/VRAM to load the align model.",
            )
        raise


def _get_audio_duration_sync(path: str) -> float:
    if not os.path.exists(path):
        raise BaseException(BaseErrorCode.NOT_FOUND, f"File not found: {path}")

    # Best path for browser uploads: webm, mp4, m4a, mp3
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "json",
                path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        data = json.loads(result.stdout or "{}")
        duration = float(data.get("format", {}).get("duration") or 0)

        if duration > 0:
            return duration

    except FileNotFoundError:
        logger.warning("[Audio] ffprobe not found. Falling back to Python audio readers.")
    except Exception as e:
        logger.debug("[Audio] ffprobe duration failed | path=%s | err=%s", path, e)

    # Fast path for formats supported by libsndfile: wav, flac, ogg...
    if sf is not None:
        try:
            info = sf.info(path)
            duration = float(info.frames) / float(info.samplerate)

            if duration > 0:
                return duration

        except Exception as e:
            logger.debug("[Audio] soundfile duration failed | path=%s | err=%s", path, e)

    # Last fallback only
    try:
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message="PySoundFile failed. Trying audioread instead.",
            )
            warnings.filterwarnings(
                "ignore",
                category=FutureWarning,
                module="librosa.core.audio",
            )

            return float(librosa.get_duration(path=path))

    except Exception:
        raise BaseException(
            BaseErrorCode.INVALID_AUDIO_FILE,
            f"Invalid audio file: {path}",
        )

def _transcribe_sync(audio_path: str):
    if not os.path.exists(audio_path):
        raise BaseException(BaseErrorCode.NOT_FOUND, f"File not found: {audio_path}")

    _ensure_whisper_model_loaded()

    try:
        with torch.no_grad():
            result = whisper_model.transcribe(audio_path, batch_size=WHISPER_BATCH_SIZE)
    except IndexError:
        # WhisperX đôi khi ném IndexError khi VAD không tìm thấy speech.
        return _no_speech_response("en")
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            _clear_cuda_cache()
            raise BaseException(
                BaseErrorCode.INTERNAL_SERVER_ERROR,
                "WhisperX does not have enough RAM/VRAM when transcribing.",
            )
        raise

    segments = result.get("segments") or []
    language_code = result.get("language") or "en"

    if not segments:
        return _no_speech_response(language_code)

    try:
        with torch.no_grad():
            align_model, metadata = _get_align_model(language_code)
            aligned = whisperx.align(
                segments,
                align_model,
                metadata,
                audio_path,
                device,
            )
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            _clear_cuda_cache()
            raise BaseException(
                BaseErrorCode.INTERNAL_SERVER_ERROR,
                "WhisperX khong du RAM/VRAM khi align.",
            )
        raise

    if isinstance(aligned, dict):
        aligned.setdefault("language", language_code)

        if DROP_WORD_SEGMENTS:
            aligned.pop("word_segments", None)

    return aligned


async def get_audio_duration(path: str) -> float:
    return await asyncio.to_thread(_get_audio_duration_sync, path)


async def transcribe(audio_path: str):
    async with _transcribe_semaphore:
        return await asyncio.to_thread(_transcribe_sync, audio_path)