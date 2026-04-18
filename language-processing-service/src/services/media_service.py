import asyncio
from src import dto
from src.errors.base_exception import BaseException
from src.errors.base_error_code import BaseErrorCode
import yt_dlp
import os
import logging as logger
import uuid
import requests
import mimetypes # Để đoán đuôi file

# PHẦN LẤY THÔNG TIN (INFO EXTRACTOR)
YDL_INFO_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'noplaylist': True,
    'extract_flat': 'in_playlist',
}
ydl_info_extractor = yt_dlp.YoutubeDL(YDL_INFO_OPTS)

AUDIO_SAVE_PATH = os.getenv('AUDIO_SAVE_PATH', 'src/temp/audio_files')

# Tạo thư mục này nếu nó chưa tồn tại
os.makedirs(AUDIO_SAVE_PATH, exist_ok=True)

YDL_DOWNLOAD_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'noplaylist': True,
    'format': 'bestaudio/best',  # Chỉ tải âm thanh tốt nhất
    'outtmpl': f'{AUDIO_SAVE_PATH}/%(id)s.%(ext)s',

    # Cấu hình chuyển đổi sang MP3 (Yêu cầu FFmpeg)
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
        'preferredquality': '192',  # Chất lượng 192kbps
    }],
}

# TẠO ĐỐI TƯỢNG DOWNLOADER TOÀN CỤC
ydl_downloader = yt_dlp.YoutubeDL(YDL_DOWNLOAD_OPTS)

# Giới hạn kích thước file tải về từ URL 
MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024  # 50MB



#  YOUTUBE AUDIO (SYNC)
def _download_youtube_audio_sync(rq: dto.MediaAudioCreateRequest) -> dto.AudioInfo:
    print("Đang lấy thông tin video...")

    try:
        # LẤY THÔNG TIN
        info = ydl_info_extractor.extract_info(rq.input_url, download=False)

        print("\n--- Thông tin Video ---")
        print(f"Tiêu đề: {info.get('title')}")
        print(f"Thời lượng: {info.get('duration_string')}")

        # Kiểm tra thời lượng
        duration_sec = info.get('duration', 0)
        if duration_sec > 600:  # Lớn hơn 10 phút (600 giây)
            raise BaseException(
                BaseErrorCode.BAD_REQUEST,
                message=f"Video quá dài ({duration_sec}s). Chỉ chấp nhận video dưới 10 phút."
            )

        print(f"Video hợp lệ (Thời lượng: {duration_sec}s). Bắt đầu tải...")

        # TẢI FILE MP3 (BLOCKING)
        ydl_downloader.download([rq.input_url])

        # Xây dựng đường dẫn file cuối cùng (để lưu vào DB)
        video_id = info.get('id')
        thumbnailUrl = info.get('thumbnail')
        print(f"Thumbnail URL: {thumbnailUrl}")
        final_mp3_path = f"{AUDIO_SAVE_PATH}/{video_id}.mp3"

        print(f"Đã tải và convert thành công: {final_mp3_path}")

        return dto.AudioInfo(
            file_path=final_mp3_path,
            duration=duration_sec,
            sourceReferenceId=video_id,
            thumbnailUrl=thumbnailUrl
        )

    except yt_dlp.utils.DownloadError as e:
        raise BaseException(
            BaseErrorCode.BAD_REQUEST,
            message=f"Lỗi khi xử lý video: {str(e)}"
        )
    except Exception as e:
        raise BaseException(
            BaseErrorCode.INTERNAL_SERVER_ERROR,
            message=f"Lỗi hệ thống: {str(e)}"
        )


#  YOUTUBE AUDIO (ASYNC)
async def download_youtube_audio(rq: dto.MediaAudioCreateRequest) -> dto.AudioInfo:
    return await asyncio.to_thread(_download_youtube_audio_sync, rq)


#  DOWNLOAD AUDIO FILE (SYNC)
def _download_audio_file_sync(rq: dto.MediaAudioCreateRequest) -> dto.AudioInfo:
    """
    Tải file audio từ một URL bất kỳ (phiên bản an toàn) - BLOCKING.
    Dùng nội bộ, bọc ngoài bằng hàm async.
    """
    audio_url = rq.input_url
    logger.info(f"Bắt đầu xử lý file audio từ URL: {audio_url}")
    try:
        # KIỂM TRA HEADERS (VALIDATION)
        with requests.head(audio_url, allow_redirects=True, timeout=5) as head_resp:
            head_resp.raise_for_status()  # Ném lỗi nếu status không phải 2xx

            # Kiểm tra loại file (Content-Type)
            content_type = head_resp.headers.get('Content-Type', '').lower()
            if not content_type.startswith('audio/'):
                logger.warning(
                    f"URL bị từ chối: Content-Type không phải audio ({content_type})"
                )
                raise BaseException(
                    BaseErrorCode.BAD_REQUEST,
                    message=f"URL không trỏ đến file audio (phát hiện: {content_type})"
                )

            # Kiểm tra dung lượng (Content-Length)
            content_length = head_resp.headers.get('Content-Length')
            if content_length and int(content_length) > MAX_AUDIO_SIZE_BYTES:
                file_size_mb = int(content_length) / 1024 / 1024
                limit_mb = MAX_AUDIO_SIZE_BYTES / 1024 / 1024
                logger.warning(
                    f"URL bị từ chối: File quá lớn ({file_size_mb:.2f} MB)"
                )
                raise BaseException(
                    BaseErrorCode.BAD_REQUEST,
                    message=(
                        f"File audio quá lớn ({file_size_mb:.2f} MB). "
                        f"Giới hạn: {limit_mb} MB"
                    )
                )

            # TẠO TÊN FILE AN TOÀN
            # Lấy đuôi file từ content-type (ví dụ: 'audio/mpeg' -> '.mp3')
            ext = mimetypes.guess_extension(content_type) or '.dat'  # Fallback nếu không đoán được
            # Tạo tên file duy nhất bằng UUID để tránh trùng lặp
            filename = (
                f"{rq.audio_name}{ext}"
                if getattr(rq, "audio_name", None)
                else f"{uuid.uuid4()}{ext}"
            )
            save_path = os.path.join(AUDIO_SAVE_PATH, filename)

        # TẢI FILE (STREAM) 
        logger.info(f"Đang tải file về {save_path}...")
        with requests.get(audio_url, stream=True, timeout=60) as r_download:
            r_download.raise_for_status()
            with open(save_path, 'wb') as f:
                for chunk in r_download.iter_content(chunk_size=8192):  # Tải từng cục 8KB
                    if chunk:
                        f.write(chunk)

        logger.info(f"Đã tải file audio thành công: {save_path}")
        return dto.AudioInfo(
            file_path=save_path,
            sourceReferenceId=filename.split('.')[0],
        )

    except requests.exceptions.Timeout:
        logger.error(f"Lỗi Timeout khi tải file: {audio_url}")
        raise BaseException(
            BaseErrorCode.BAD_REQUEST,
            message="Tải file thất bại: Hết thời gian chờ (Timeout)"
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Lỗi khi tải file audio từ URL: {e}")
        raise BaseException(
            BaseErrorCode.BAD_REQUEST,
            message=f"Lỗi tải file audio từ URL: {str(e)}"
        )
    except BaseException:
        # Ném lại lỗi BaseException (ví dụ: file quá lớn)
        raise
    except Exception as e:
        logger.error(f"Lỗi không xác định khi tải file: {e}", exc_info=True)
        raise BaseException(
            BaseErrorCode.INTERNAL_SERVER_ERROR,
            message=f"Lỗi hệ thống khi xử lý file: {str(e)}"
        )

#  DOWNLOAD AUDIO FILE (ASYNC)
async def download_audio_file(rq: dto.MediaAudioCreateRequest) -> dto.AudioInfo:
    return await asyncio.to_thread(_download_audio_file_sync, rq)
