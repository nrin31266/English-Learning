package com.rin.dictionaryservice.exception;

import com.rin.englishlearning.common.exception.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum DictionaryErrorCode implements ErrorCode {

    ;



    private final int code;
    private final String message;
    private final HttpStatus status;

}
