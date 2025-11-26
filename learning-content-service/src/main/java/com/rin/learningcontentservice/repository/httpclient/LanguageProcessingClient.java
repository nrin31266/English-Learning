package com.rin.learningcontentservice.repository.httpclient;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.response.AIJobResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;

@FeignClient(name = "language-processing-client", url = "http://localhost:8089")
public interface LanguageProcessingClient {

    @PostMapping(value = "/ai-jobs", headers = "Content-Type=application/json")
    ApiResponse<AIJobResponse> createAIJob();
}
