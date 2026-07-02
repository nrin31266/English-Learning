package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.response.LessonDetailsResponse;
import com.rin.learningcontentservice.dto.response.HomeLessonResponse;
import com.rin.learningcontentservice.service.LessonService;
import com.rin.learningcontentservice.utils.SecurityUtils;
import com.rin.englishlearning.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/lessons")
public class LessonController {
    private final LessonService lessonService;

    @GetMapping("/explore")
    public ApiResponse<PageResponse<HomeLessonResponse>> explore(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String topicSlug,
            @RequestParam(defaultValue = "ALL") String levelGroup,
            @RequestParam(defaultValue = "ALL") String mode,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(required = false) String sourceType,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ApiResponse.success(lessonService.exploreLessons(
                q, topicSlug, levelGroup, mode, status, sourceType, sort, page, size,
                SecurityUtils.getCurrentUserId()));
    }

    @GetMapping("/{id}")
    public ApiResponse<LessonDetailsResponse> getLessonDetails(
            @PathVariable Long id
    ) {
        return ApiResponse.success(
                lessonService.getLessonDetailsWithoutInActivateSentences(id)
        );
    }


}
