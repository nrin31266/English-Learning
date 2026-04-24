package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.SaveShadowingProcess;
import com.rin.learningcontentservice.dto.response.ShadowingScoreResponse;
import com.rin.learningcontentservice.service.LessonProcessingService;
import lombok.RequiredArgsConstructor;
import org.bouncycastle.util.Objects;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/process/")
public class LessonProcessingController {
    private final LessonProcessingService lessonProcessingService;

    @PutMapping("/shadowing/{lessonId}/{sentenceId}")
    public ApiResponse<ShadowingScoreResponse> processShadowing(
            @PathVariable Long lessonId,
            @PathVariable Long sentenceId,
            @RequestBody SaveShadowingProcess request
            ) {


       return ApiResponse.success( lessonProcessingService.save(request.getFluencyScore(),request.getScore(), lessonId, sentenceId));
    }
}
