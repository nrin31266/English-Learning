from __future__ import annotations # Set in top of file for forward type references
import httpx
import json
import os
import json
from typing import Any, Optional
from pydantic import ValidationError
from src.dto import LessonGenerationAiMetadataDto




def lesson_parse_ai_meta_data(metadata: Optional[Any]) -> LessonGenerationAiMetadataDto:

    if not metadata:
        return LessonGenerationAiMetadataDto()  # metadata rỗng

    # Nếu là string -> parse JSON
    if isinstance(metadata, str):
        try:
            data = json.loads(metadata)
        except Exception:
            return LessonGenerationAiMetadataDto()
    # Nếu là dict -> dùng luôn
    elif isinstance(metadata, dict):
        data = metadata
    else:
        return LessonGenerationAiMetadataDto()

    # Chuẩn hóa key: camelCase → snake_case
    normalized = {}
    for key, value in data.items():
        snake = (
            key.replace("-", "_")
                .replace(" ", "_")
                .replace("Started", "_started")
                .lower()
        )
        normalized[snake] = value

    # Parse DTO
    try:
        return LessonGenerationAiMetadataDto(**normalized)
    except ValidationError:
        return LessonGenerationAiMetadataDto()

async def fetch_json_from_url(url: str):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            return response.json()
    except Exception as e:
        print(f"Lỗi khi tải JSON từ {url}: {e}")
        return None

def file_exists(path: str) -> bool:
    """
    Kiểm tra file local có tồn tại trong hệ thống hay không.
    """
    return os.path.isfile(path)
def remove_local_file(file_path: str):
    try:
        os.remove(file_path)
        print(f"Đã xóa file tạm thời: {file_path}")
    except OSError as e:
        print(f"Lỗi khi xóa file {file_path}: {e.strerror}")
        


