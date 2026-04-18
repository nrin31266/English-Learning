import asyncio
import logging
from typing import Union, IO
import cloudinary.uploader
from src.errors.base_exception import BaseException
from src.errors.base_error_code import BaseErrorCode

logger = logging.getLogger(__name__)

# --- Private Helpers ---
def _core_upload(public_id: str, file_source, **kwargs) -> str:
    try:
        result = cloudinary.uploader.upload(
            file=file_source,  # ✅ FIX CHÍNH
            public_id=public_id,
            overwrite=True,
            **kwargs
        )

        url = result.get("secure_url")
        if not url:
            raise ValueError("Cloudinary did not return secure_url")

        logger.info(f"Success: {public_id} -> {url}")
        return url

    except Exception as e:
        logger.error(f"Upload failed [{public_id}]: {str(e)}", exc_info=True)
        raise BaseException(
            BaseErrorCode.INTERNAL_SERVER_ERROR,
            message=f"Cloud upload error: {str(e)}"
        )

def _upload_file_sync(file_source, public_id: str, resource_type: str = "auto") -> str:
    return _core_upload(
        public_id=public_id,
        file_source=file_source,  # giữ nguyên
        resource_type=resource_type
    )

def _upload_json_content_sync(json_str: str, public_id: str) -> str:
    return _core_upload(
        public_id=public_id,
        file_source=json_str.encode("utf-8"),
        resource_type="raw",
        format="json"
    )

# --- Public Async API ---

async def upload_file(file_source: Union[str, IO], public_id: str, resource_type: str = "auto") -> str:
    return await asyncio.to_thread(_upload_file_sync, file_source, public_id, resource_type)

async def upload_json_content(json_str: str, public_id: str) -> str:
    return await asyncio.to_thread(_upload_json_content_sync, json_str, public_id)