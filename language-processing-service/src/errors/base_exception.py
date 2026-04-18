from fastapi import HTTPException
from .base_error_code import BaseErrorCode


class BaseException(HTTPException):
    def __init__(self, error_code: BaseErrorCode, message: str = None):
        self.error_code = error_code
        detail = message or error_code.message
        super().__init__(
            status_code=error_code.status.value,
            detail={"code": error_code.code, "message": detail},
        )
