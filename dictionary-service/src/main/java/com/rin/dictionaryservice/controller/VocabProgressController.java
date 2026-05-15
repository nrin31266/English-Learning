package com.rin.dictionaryservice.controller;

import com.rin.dictionaryservice.dto.progress.BatchProgressRequest;
import com.rin.dictionaryservice.model.VocabProgress;
import com.rin.dictionaryservice.service.VocabProgressService;
import com.rin.englishlearning.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/vocab/progress")
@RequiredArgsConstructor
public class VocabProgressController {

    private final VocabProgressService progressService;

    @PostMapping("/batch")
    public ApiResponse<Void> batchSync(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody BatchProgressRequest req) {
        String userId = jwt.getSubject();
        progressService.batchSync(userId, req);
        return ApiResponse.success(null, "Progress synced");
    }

    @GetMapping("/topics/{topicId}")
    public ApiResponse<List<VocabProgress>> getTopicProgress(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String topicId) {
        String userId = jwt.getSubject();
        return ApiResponse.success(progressService.getTopicProgress(userId, topicId));
    }
}
