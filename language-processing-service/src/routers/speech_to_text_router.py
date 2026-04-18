import json
import os
import uuid
from fastapi import Depends, Form, UploadFile, File, HTTPException, APIRouter, status
from src.services.shadowing_service import build_shadowing_result
from src import dto
from src.auth.dto import UserPrincipal
from src.dto import ApiResponse
from src.auth.dependencies import get_current_user
from src.services.speech_to_text_service import transcribe, get_audio_duration

router = APIRouter(prefix="/speech-to-text", tags=["Speech to Text"])

# Thư mục tạm để lưu file upload
UPLOAD_DIR = "src/temp/shadowing"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/transcribe", response_model=ApiResponse[dto.TranscriptionResponse])
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file to transcribe"),
    sentenceId: int = Form(...),
    expectedWords: str = Form(...),
    # current_user: UserPrincipal = Depends(get_current_user),
):
    """
    Upload audio file and transcribe using WhisperX (async, non-blocking).
    """
    # Parse ShadowingRequest từ Form
    try:
        words_raw = json.loads(expectedWords)
        shadowing_rq = dto.ShadowingRequest(
            sentenceId=sentenceId,
            expectedWords=[dto.ShadowingWord(**w) for w in words_raw],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid expectedWords payload: {e}",
        )

    print(f"Received shadowing request: {shadowing_rq}")
    try:
        # Kiểm tra file type
        allowed_extensions = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"}
        file_extension = os.path.splitext(file.filename)[1].lower()

        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not supported. Allowed: {allowed_extensions}",
            )

        # Tạo file path tạm
        file_id = str(uuid.uuid4())
        temp_file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")

        # Lưu file upload
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        try:
            # Get audio duration (async wrapper -> chạy trong thread pool)
            duration = await get_audio_duration(temp_file_path)

            # Transcribe với WhisperX (async wrapper)
            transcription_result = await transcribe(temp_file_path)
            
            # Build shadowing result
            shadowing_result = build_shadowing_result(shadowing_rq, transcription_result)

            # Format response
            segments = []
            for segment in transcription_result.get("segments", []):
                segments.append(
                    dto.TranscriptionSegment(
                        start=segment.get("start", 0),
                        end=segment.get("end", 0),
                        text=segment.get("text", ""),
                        words=segment.get("words", []),
                    )
                )

            response = dto.TranscriptionResponse(
                id=file_id,
                filename=file.filename,
                duration=duration,
                language=transcription_result.get("language", "en"),
                segments=segments,
                full_text=transcription_result.get("text", ""),
                shadowingResult=shadowing_result,  # gắn vào đây
            )

            return ApiResponse.success(data=response)

        finally:
            # Cleanup: Xóa file tạm sau khi xử lý
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                print(f"Temporary file removed: {temp_file_path}")

    except HTTPException:
        # Giữ nguyên HTTPException đã raise ở trên (file type, ...)
        raise
    except Exception as e:
        # Bọc mọi lỗi khác thành 500
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}",
        )
