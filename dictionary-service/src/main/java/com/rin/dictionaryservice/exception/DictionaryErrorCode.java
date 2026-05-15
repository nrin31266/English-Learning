package com.rin.dictionaryservice.exception;

import com.rin.englishlearning.common.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum DictionaryErrorCode implements ErrorCode {
    TOPIC_NOT_FOUND(2001, "Topic not found: %s", HttpStatus.NOT_FOUND),
    SUBTOPIC_NOT_FOUND(2002, "Subtopic not found: %s", HttpStatus.NOT_FOUND),
    WORD_ENTRY_NOT_FOUND(2003, "Word entry not found: %s", HttpStatus.NOT_FOUND),

    TOPIC_NOT_READY(2004, "Topic must be READY before publishing", HttpStatus.BAD_REQUEST),
    SUBTOPIC_NOT_READY(2005, "Subtopic must be READY before publishing", HttpStatus.BAD_REQUEST),

    AI_SINGLE_MEANING_PARSE_FAILED(2006, "Failed to parse single meaning AI result", HttpStatus.BAD_GATEWAY),
    AI_SUBTOPIC_PARSE_FAILED(2007, "Failed to parse AI subtopic response", HttpStatus.BAD_GATEWAY),
    AI_WORD_LIST_PARSE_FAILED(2008, "Failed to parse AI word list response", HttpStatus.BAD_GATEWAY),
    AI_RESULT_SERIALIZATION_FAILED(2009, "AI result serialization failed", HttpStatus.BAD_GATEWAY),

    IMAGE_UPLOAD_FAILED(2010, "Image upload failed", HttpStatus.BAD_GATEWAY),
    IMAGE_UPLOAD_RESPONSE_INVALID(2011, "Upload response missing 'url' field", HttpStatus.BAD_GATEWAY),

    WORD_NOT_FOUND(2012, "Word not found: %s", HttpStatus.NOT_FOUND),
    WORD_ALREADY_EXISTS(2013, "Word already exists: %s", HttpStatus.CONFLICT),
    WORD_IN_USE(2014, "Cannot delete word because it is used by %s vocab entries.", HttpStatus.BAD_REQUEST),
    WORD_DEFINITION_INDEX_INVALID(2015, "Definition index invalid: %s", HttpStatus.BAD_REQUEST),
    WORD_CREATE_INVALID(2016, "Word create invalid: %s", HttpStatus.BAD_REQUEST),
    WORD_UPDATE_INVALID(2017, "Word update invalid: %s", HttpStatus.BAD_REQUEST)

    ;



    private final int code;
    private final String message;
    private final HttpStatus status;

}
