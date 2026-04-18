from fastapi import Request, HTTPException 
from fastapi.responses import JSONResponse
from .base_exception import BaseException
from .base_error_code import BaseErrorCode
import logging



async def base_exception_handler(request: Request, exc: BaseException):
    """Handler cho BaseException"""
    logging.error(f"BaseException occurred.")
    return JSONResponse(
        status_code=exc.error_code.status.value,
        content={
            "code": exc.error_code.code,
            "message": exc.detail["message"] if isinstance(exc.detail, dict) else str(exc.detail),
        },
    )


async def global_exception_handler(request: Request, exc: Exception):
    """Handler cho các lỗi không xác định"""
    logging.error(f"Unexpected error occurred.")
    error = BaseErrorCode.INTERNAL_SERVER_ERROR
    return JSONResponse(
        status_code=error.status.value,
        content={"code": error.code, "message": str(exc)},
    )
# --- Handler cho HTTPException --- #
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handler cho HTTPException"""
    logging.error(f"HTTPException occurred.")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.status_code,
            "message": exc.detail,
        },
    )