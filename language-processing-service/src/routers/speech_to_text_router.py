import os
import uuid
import json
import warnings
import traceback
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, status
from pydantic import ValidationError

from src.services.shadowing_service import build_shadowing_result
from src import dto
# from src.auth.dto import UserPrincipal
# from src.auth.dependencies import get_current_user
from src.dto import ApiResponse
from src.services.speech_to_text_service import transcribe, get_audio_duration

# Ẩn các warning rác do librosa fallback sang audioread khi đọc file webm
warnings.filterwarnings("ignore", message="PySoundFile failed. Trying audioread instead.")
warnings.filterwarnings("ignore", category=FutureWarning, module="librosa.core.audio")

router = APIRouter(prefix="/speech-to-text", tags=["Speech to Text"])

UPLOAD_DIR = "src/temp/shadowing"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/transcribe", response_model=ApiResponse[dto.TranscriptionResponse])
async def transcribe_audio(
    file: UploadFile = File(...),
    sentenceId: int = Form(...),
    expectedWords: str = Form(...),
    # current_user: UserPrincipal = Depends(get_current_user),
):
    # 1. Parse JSON từ form data
    try:
        words_raw = json.loads(expectedWords)
        if not isinstance(words_raw, list):
            raise ValueError("expectedWords phải là một mảng (array)")
            
        shadowing_rq = dto.ShadowingRequest(
            sentenceId=sentenceId,
            expectedWords=[dto.ShadowingWord(**w) for w in words_raw],
        )
    except (json.JSONDecodeError, ValueError, ValidationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dữ liệu expectedWords không hợp lệ: {str(e)}",
        )

    # 2. Validate đuôi file (hỗ trợ thêm mp4 cho iOS/Safari)
    allowed_extensions = {".webm", ".mp4"}
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng không được hỗ trợ. Chỉ nhận: {allowed_extensions}",
        )

    # 3. Lưu file tạm để xử lý
    file_id = str(uuid.uuid4())
    temp_file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")

    try:
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # 4. Trích xuất audio và chạy mô hình AI
        duration = await get_audio_duration(temp_file_path)
        transcription_result = await transcribe(temp_file_path)
        
        # 5. Chấm điểm phát âm
        shadowing_result = build_shadowing_result(shadowing_rq, transcription_result)

        # 6. Map dữ liệu response
        segments = [
            dto.TranscriptionSegment(
                start=segment.get("start", 0),
                end=segment.get("end", 0),
                text=segment.get("text", ""),
                words=segment.get("words", []),
            )
            for segment in transcription_result.get("segments", [])
        ]

        response = dto.TranscriptionResponse(
            id=file_id,
            filename=file.filename,
            duration=duration,
            language=transcription_result.get("language", "en"),
            segments=segments,
            full_text=transcription_result.get("text", ""),
            errorCode=transcription_result.get("error"),
            errorMessage=transcription_result.get("message"),
            shadowingResult=shadowing_result,
        )

        if response.errorCode == "NO_SPEECH":
            return ApiResponse.success(
                data=response,
                message="Không phát hiện giọng nói. Hãy kiểm tra lại mic.",
            )

        return ApiResponse.success(data=response)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi xử lý audio: {str(e)}",
        )
    finally:
        # 7. Luôn dọn dẹp file tạm để tránh rác ổ cứng
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)