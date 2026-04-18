from http import HTTPStatus
from enum import Enum


class BaseErrorCode(Enum):
    # Common errors
    INTERNAL_SERVER_ERROR = (9999, "Lỗi máy chủ nội bộ", HTTPStatus.INTERNAL_SERVER_ERROR)
    
    
    INVALID_REQUEST = (1001, "Dữ liệu yêu cầu không hợp lệ", HTTPStatus.BAD_REQUEST)
    UNAUTHORIZED = (1002, "Không được phép", HTTPStatus.UNAUTHORIZED)
    NO_ACCESS = (1003, "Không có quyền truy cập", HTTPStatus.FORBIDDEN)
    RESOURCE_NOT_FOUND = (1004, "Không tìm thấy tài nguyên", HTTPStatus.NOT_FOUND)
    NOT_FOUND = (1005, "Không tìm thấy", HTTPStatus.NOT_FOUND)
    BAD_REQUEST = (1006, "Yêu cầu không hợp lệ", HTTPStatus.BAD_REQUEST)
    INVALID_AUDIO_FILE = (1007, "Tệp âm thanh không hợp lệ", HTTPStatus.BAD_REQUEST)

    def __init__(self, code: int, message: str, status: HTTPStatus):
        self.code = code
        self.message = message
        self.status = status

    def format_message(self, *args):
        """Same String.format() in Java"""
        return self.message % args if args else self.message
