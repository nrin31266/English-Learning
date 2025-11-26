package com.rin.learningcontentservice.exception;

import com.rin.englishlearning.common.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum LearningContentErrorCode implements ErrorCode {
    LESSON_NOT_FOUND(1001, "Lesson not found with id: %s", HttpStatus.NOT_FOUND),
    LESSON_WITH_NAME_EXISTS(1002, "Lesson with name '%s' already exists", HttpStatus.CONFLICT),
    TOPIC_NOT_FOUND(1003, "Topic not found with slug: %s", HttpStatus.NOT_FOUND),
    TOPIC_WITH_NAME_EXISTS(1004, "Topic with name '%s' already exists", HttpStatus.CONFLICT),
    LESSON_NOT_AI_ASSISTED(1005, "Lesson with id: %s is not AI assisted", HttpStatus.BAD_REQUEST),
    AI_JOB_CREATION_FAILED (1006, "Failed to create AI job for lesson id: %s", HttpStatus.INTERNAL_SERVER_ERROR)
    ;



    private final int code;
    private final String message;
    private final HttpStatus status;

}
