package com.rin.englishlearning.common.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum BaseErrorCode implements ErrorCode {
    // 🔹 Common errors
    INTERNAL_SERVER_ERROR(9000, "Internal Server Error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_REQUEST(9001, "Invalid Request", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(9002, "UNAUTHORIZED", HttpStatus.UNAUTHORIZED),
    NO_ACCESS(9003, "No Access", HttpStatus.FORBIDDEN),
    RESOURCE_NOT_FOUND(9004, "Resource Not Found", HttpStatus.NOT_FOUND),

    ;


    private final int code;
    private final String message;
    private final HttpStatus status;
}
