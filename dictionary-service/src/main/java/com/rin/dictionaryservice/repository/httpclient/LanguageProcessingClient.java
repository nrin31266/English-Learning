package com.rin.dictionaryservice.repository.httpclient;

import com.rin.dictionaryservice.dto.*;
import com.rin.englishlearning.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "language-processing-client", url = "${language-processing.url:http://localhost:8089}")
public interface LanguageProcessingClient {

    @PostMapping(value = "/spacy/word-analysis", headers = "Content-Type=application/json")
    ApiResponse<SpaCyWordAnalysisDto> analyzeWord(
            @RequestBody SpaCyWordAnalysisRequest request
    );

//    @PostMapping(value = "/internal/ai/generate", headers = "Content-Type=application/json")
//    AiGenerateResponse generateJson(
//            @RequestHeader("X-Worker-Key") String workerKey,
//            @RequestBody AiGenerateRequest request
//    );

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
