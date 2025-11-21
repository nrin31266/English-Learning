package com.rin.learningcontentservice.exception;

import com.rin.englishlearning.common.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum LearningContentErrorCode implements ErrorCode {
    LESSON_NOT_FOUND(1001, "Lesson not found with id: %s", HttpStatus.NOT_FOUND),
    LESSON_WITH_NAME_EXISTS(1002, "Lesson with name '%s' already exists", HttpStatus.CONFLICT)
    ;



    private final int code;
    private final String message;
    private final HttpStatus status;

}
