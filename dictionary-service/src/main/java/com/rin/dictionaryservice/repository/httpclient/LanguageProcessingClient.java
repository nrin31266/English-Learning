package com.rin.dictionaryservice.repository.httpclient;

import com.rin.dictionaryservice.dto.SpaCyWordAnalysisDto;
import com.rin.dictionaryservice.dto.SpaCyWordAnalysisRequest;
import com.rin.englishlearning.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "language-processing-client", url = "http://localhost:8089")
public interface LanguageProcessingClient {

    @PostMapping(value = "/spacy/word-analysis", headers = "Content-Type=application/json")
    ApiResponse<SpaCyWordAnalysisDto> analyzeWord(
            @RequestBody SpaCyWordAnalysisRequest  request
            );
}
