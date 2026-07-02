package com.rin.dictionaryservice.repository.httpclient;

import com.rin.dictionaryservice.dto.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "language-processing-client", url = "${language-processing.url:http://localhost:8089}")
public interface LanguageProcessingClient {

    @PostMapping(value = "/internal/vocab/gen-subtopics", headers = "Content-Type=application/json")
    AiGenerateResponse genSubtopics(
            @RequestHeader("X-Worker-Key") String workerKey,
            @RequestBody VocabGenSubtopicsRequest request
    );

    @PostMapping(value = "/internal/vocab/gen-words", headers = "Content-Type=application/json")
    AiGenerateResponse genWords(
            @RequestHeader("X-Worker-Key") String workerKey,
            @RequestBody VocabGenWordsRequest request
    );

    @PostMapping(value = "/internal/vocab/generate-single-meaning", headers = "Content-Type=application/json")
    AiGenerateResponse generateSingleMeaning(
            @RequestHeader("X-Worker-Key") String workerKey,
            @RequestBody SingleMeaningRequest request
    );
}
