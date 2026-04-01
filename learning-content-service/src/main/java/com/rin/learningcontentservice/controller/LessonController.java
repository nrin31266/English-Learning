package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.response.LessonDetailsResponse;
import com.rin.learningcontentservice.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/lessons")
public class LessonController {
    private final LessonService lessonService;

    @GetMapping("/{slug}")
    public ApiResponse<LessonDetailsResponse> getLessonDetails(
            @PathVariable String slug) {
        return ApiResponse.success(lessonService.getLessonDetailsWithoutInActivateSentences(slug));
    }
}
