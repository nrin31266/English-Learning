import json
import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError

from src import dto
from src.dto import ApiResponse
from src.errors.base_exception import BaseException as AppBaseException
from src.services.shadowing_service import build_shadowing_result
from src.services.speech_to_text_service import get_audio_duration, transcribe

# from src.auth.dto import UserPrincipal
# from src.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/speech-to-text", tags=["Speech to Text"])

UPLOAD_DIR = Path(os.getenv("SHADOWING_UPLOAD_DIR", "src/temp/shadowing"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".webm", ".mp4"}


def _parse_shadowing_request(sentence_id: int, expected_words: str) -> dto.ShadowingRequest:
    try:
        words_raw = json.loads(expected_words)

        if not isinstance(words_raw, list):
            raise ValueError("expectedWords must be a JSON array.")

        return dto.ShadowingRequest(
            sentenceId=sentence_id,
            expectedWords=[dto.ShadowingWord(**word) for word in words_raw],
        )

    except (json.JSONDecodeError, ValueError, ValidationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid expectedWords payload: {str(e)}",
        )


def _validate_audio_file(file: UploadFile) -> str:
    filename = file.filename or ""
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format. Allowed formats: {sorted(ALLOWED_EXTENSIONS)}",
        )

    return extension


async def _save_upload_file(file: UploadFile, extension: str) -> tuple[str, Path]:
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}{extension}"

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty.",
        )

    file_path.write_bytes(content)

    logger.info(
        "[SpeechToText] Upload saved | id=%s | filename=%s | size=%.2fKB | path=%s",
        file_id,
        file.filename,
        len(content) / 1024,
        file_path,
    )

    return file_id, file_path


def _build_response(
    file_id: str,
    filename: str | None,
    duration: float,
    transcription_result: dict,
    shadowing_result,
) -> dto.TranscriptionResponse:
    segments = [
        dto.TranscriptionSegment(
            start=segment.get("start", 0),
            end=segment.get("end", 0),
            text=segment.get("text", ""),
            words=segment.get("words", []),
        )
        for segment in transcription_result.get("segments", [])
    ]

    return dto.TranscriptionResponse(
        id=file_id,
        filename=filename or "",
        duration=duration,
        language=transcription_result.get("language", "en"),
        segments=segments,
        full_text=transcription_result.get("text", ""),
        errorCode=transcription_result.get("error"),
        errorMessage=transcription_result.get("message"),
        shadowingResult=shadowing_result,
    )


@router.post("/transcribe", response_model=ApiResponse[dto.TranscriptionResponse])
async def transcribe_audio(
    file: UploadFile = File(...),
    sentenceId: int = Form(...),
    expectedWords: str = Form(...),
    # current_user: UserPrincipal = Depends(get_current_user),
):
    shadowing_rq = _parse_shadowing_request(sentenceId, expectedWords)
    extension = _validate_audio_file(file)

    file_id = ""
    temp_file_path: Path | None = None

    try:
        file_id, temp_file_path = await _save_upload_file(file, extension)

        logger.info(
            "[SpeechToText] Transcription started | id=%s | sentence_id=%s",
            file_id,
            sentenceId,
        )

        duration = await get_audio_duration(str(temp_file_path))
        transcription_result = await transcribe(str(temp_file_path))
        shadowing_result = build_shadowing_result(shadowing_rq, transcription_result)

        response = _build_response(
            file_id=file_id,
            filename=file.filename,
            duration=duration,
            transcription_result=transcription_result,
            shadowing_result=shadowing_result,
        )

        logger.info(
            "[SpeechToText] Transcription completed | id=%s | duration=%.2fs | segments=%s | error=%s",
            file_id,
            duration,
            len(response.segments),
            response.errorCode or "-",
        )

        if response.errorCode == "NO_SPEECH":
            return ApiResponse.success(
                data=response,
                message="No speech detected. Please check your microphone and try again.",
            )

        return ApiResponse.success(data=response)

    except AppBaseException as e:
        logger.warning(
            "[SpeechToText] Transcription rejected | id=%s | err=%s",
            file_id or "-",
            e,
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(
            "[SpeechToText] Transcription failed | id=%s",
            file_id or "-",
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"System error while processing audio: {str(e)}",
        )

    finally:
        if temp_file_path and temp_file_path.exists():
            temp_file_path.unlink(missing_ok=True)
            logger.debug(
                "[SpeechToText] Temp file removed | id=%s | path=%s",
                file_id or "-",
                temp_file_path,
            )