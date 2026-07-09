import asyncio
import logging
import mimetypes
import os
import uuid
from pathlib import Path
from urllib.parse import urlparse

import requests
import yt_dlp

from src import dto
from src.errors.base_exception import BaseException
from src.errors.base_error_code import BaseErrorCode

logger = logging.getLogger(__name__)

AUDIO_SAVE_PATH = os.getenv("AUDIO_SAVE_PATH", "src/temp/audio_files")
MAX_YOUTUBE_DURATION_SECONDS = int(os.getenv("MAX_YOUTUBE_DURATION_SECONDS", "1800"))
MAX_AUDIO_SIZE_MB = int(os.getenv("MAX_AUDIO_SIZE_MB", "200"))
MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024

Path(AUDIO_SAVE_PATH).mkdir(parents=True, exist_ok=True)


YDL_INFO_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "noplaylist": True,
    "extract_flat": False,
}

YDL_DOWNLOAD_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "noplaylist": True,
    "format": "bestaudio/best",
    "outtmpl": f"{AUDIO_SAVE_PATH}/%(id)s.%(ext)s",
    "postprocessors": [
        {
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }
    ],
}

ydl_info_extractor = yt_dlp.YoutubeDL(YDL_INFO_OPTS)
ydl_downloader = yt_dlp.YoutubeDL(YDL_DOWNLOAD_OPTS)


def _safe_filename(name: str | None, ext: str) -> str:
    raw_name = name or str(uuid.uuid4())

    safe_name = "".join(
        char if char.isalnum() or char in ("-", "_") else "_"
        for char in raw_name.strip()
    )

    safe_name = safe_name[:120] or str(uuid.uuid4())

    if not ext.startswith("."):
        ext = f".{ext}"

    return f"{safe_name}{ext}"


def _guess_extension(content_type: str, url: str) -> str:
    content_type = (content_type or "").split(";")[0].strip().lower()

    ext = mimetypes.guess_extension(content_type)
    if ext:
        if ext == ".mpga":
            return ".mp3"
        return ext

    path_ext = Path(urlparse(url).path).suffix
    if path_ext:
        return path_ext

    return ".mp3"


def _validate_audio_response(
    resp: requests.Response,
    audio_url: str,
) -> tuple[str, int | None]:
    content_type = resp.headers.get("Content-Type", "").lower()
    content_length = resp.headers.get("Content-Length")

    allowed = (
        content_type.startswith("audio/")
        or content_type.startswith("video/")
        or "octet-stream" in content_type
        or not content_type
    )

    if not allowed:
        raise BaseException(
            BaseErrorCode.BAD_REQUEST,
            message=f"URL does not point to a valid audio/video file. Content-Type: {content_type}",
        )

    size = int(content_length) if content_length and content_length.isdigit() else None

    if size and size > MAX_AUDIO_SIZE_BYTES:
        raise BaseException(
            BaseErrorCode.BAD_REQUEST,
            message=(
                f"File is too large ({size / 1024 / 1024:.2f} MB). "
                f"Limit: {MAX_AUDIO_SIZE_MB} MB."
            ),
        )

    ext = _guess_extension(content_type, audio_url)

    return ext, size


def _download_youtube_audio_sync(rq: dto.MediaAudioCreateRequest) -> dto.AudioInfo:
    logger.info("[Media] Extracting YouTube info | url=%s", rq.input_url)

    try:
        info = ydl_info_extractor.extract_info(rq.input_url, download=False)

        video_id = info.get("id")
        title = info.get("title", "")
        description = info.get("description", "")
        duration_sec = int(info.get("duration") or 0)
        thumbnail_url = info.get("thumbnail")

        logger.info(
            "[Media] YouTube info extracted | id=%s | duration=%ss | title=%s",
            video_id,
            duration_sec,
            title,
        )

        if duration_sec > MAX_YOUTUBE_DURATION_SECONDS:
            raise BaseException(
                BaseErrorCode.BAD_REQUEST,
                message=(
                    f"Video is too long ({duration_sec}s). "
                    f"Current limit: {MAX_YOUTUBE_DURATION_SECONDS}s."
                ),
            )

        logger.info("[Media] Downloading YouTube audio | id=%s", video_id)

        ydl_downloader.download([rq.input_url])

        final_mp3_path = os.path.join(AUDIO_SAVE_PATH, f"{video_id}.mp3")

        if not os.path.exists(final_mp3_path):
            raise BaseException(
                BaseErrorCode.INTERNAL_SERVER_ERROR,
                message=f"MP3 file was not found after download: {final_mp3_path}",
            )

        logger.info(
            "[Media] YouTube audio downloaded | id=%s | path=%s",
            video_id,
            final_mp3_path,
        )

        return dto.AudioInfo(
            file_path=final_mp3_path,
            duration=duration_sec,
            sourceReferenceId=video_id,
            sourceTitle=title,
            sourceDescription=description,
            thumbnailUrl=thumbnail_url,
        )

    except BaseException:
        raise

    except yt_dlp.utils.DownloadError as e:
        raise BaseException(
            BaseErrorCode.BAD_REQUEST,
            message=f"Failed to process YouTube video: {str(e)}",
        )

    except Exception as e:
        logger.exception("[Media] YouTube audio download failed")
        raise BaseException(
            BaseErrorCode.INTERNAL_SERVER_ERROR,
            message=f"System error while processing YouTube audio: {str(e)}",
        )


async def download_youtube_audio(rq: dto.MediaAudioCreateRequest) -> dto.AudioInfo:
    return await asyncio.to_thread(_download_youtube_audio_sync, rq)


def _download_audio_file_sync(rq: dto.MediaAudioCreateRequest) -> dto.AudioInfo:
    audio_url = rq.input_url

    logger.info("[Media] Audio file download started | url=%s", audio_url)

    try:
        with requests.head(audio_url, allow_redirects=True, timeout=10) as head_resp:
            head_resp.raise_for_status()
            ext, _ = _validate_audio_response(head_resp, audio_url)

        filename = _safe_filename(getattr(rq, "audio_name", None), ext)
        save_path = os.path.join(AUDIO_SAVE_PATH, filename)

        downloaded_bytes = 0

        with requests.get(audio_url, stream=True, timeout=90) as resp:
            resp.raise_for_status()

            _validate_audio_response(resp, audio_url)

            with open(save_path, "wb") as file:
                for chunk in resp.iter_content(chunk_size=1024 * 256):
                    if not chunk:
                        continue

                    downloaded_bytes += len(chunk)

                    if downloaded_bytes > MAX_AUDIO_SIZE_BYTES:
                        try:
                            os.remove(save_path)
                        except OSError:
                            pass

                        raise BaseException(
                            BaseErrorCode.BAD_REQUEST,
                            message=f"File is too large. Limit: {MAX_AUDIO_SIZE_MB} MB.",
                        )

                    file.write(chunk)

        logger.info(
            "[Media] Audio file downloaded | path=%s | size=%.2fMB",
            save_path,
            downloaded_bytes / 1024 / 1024,
        )

        return dto.AudioInfo(
            file_path=save_path,
            sourceReferenceId=Path(filename).stem,
            sourceTitle=Path(filename).stem.replace("_", " "),
        )

    except BaseException:
        raise

    except requests.exceptions.Timeout:
        raise BaseException(
            BaseErrorCode.BAD_REQUEST,
            message="File download failed: request timed out.",
        )

    except requests.exceptions.RequestException as e:
        raise BaseException(
            BaseErrorCode.BAD_REQUEST,
            message=f"Failed to download audio file from URL: {str(e)}",
        )

    except Exception as e:
        logger.exception("[Media] Audio file download failed")
        raise BaseException(
            BaseErrorCode.INTERNAL_SERVER_ERROR,
            message=f"System error while processing audio file: {str(e)}",
        )


async def download_audio_file(rq: dto.MediaAudioCreateRequest) -> dto.AudioInfo:
    return await asyncio.to_thread(_download_audio_file_sync, rq)
