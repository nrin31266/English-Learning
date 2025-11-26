package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.LessonFilterRequest;
import com.rin.learningcontentservice.dto.response.LessonDetailsResponse;
import com.rin.learningcontentservice.dto.response.LessonMinimalResponse;
import com.rin.learningcontentservice.dto.response.LessonResponse;
import com.rin.learningcontentservice.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/")
public class LessonController {

    private final LessonService lessonService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/lessons" )
    public ApiResponse<LessonMinimalResponse> generateLessons(
            @RequestBody AddLessonRequest addLessonRequest
            ) {
        return ApiResponse.success(lessonService.addLesson(addLessonRequest));
    }




    @GetMapping("/lessons")
    public ApiResponse<Page<LessonResponse>> getLessons(
            LessonFilterRequest filter,
            @PageableDefault(size = 8) Pageable pageable
    ) {
        return ApiResponse.success(lessonService.getAllLessons(filter, pageable));
    }

    @GetMapping("/lessons/{slug}")
    public ApiResponse<LessonDetailsResponse> getLessonBySlug(
            @PathVariable String slug
    ) {
        return ApiResponse.success(lessonService.getLessonDetails(slug));
    }
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/lessons/{id}/re-try" )
    public ApiResponse<LessonMinimalResponse> retryLessonGeneration(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") Boolean isRestart
    ) {
        return ApiResponse.success(lessonService.retryLessonGeneration(id, isRestart), "Lesson generation retried successfully");
    }
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/lessons/{id}/cancel-ai-processing" )
    public ApiResponse<LessonMinimalResponse> cancelAiProcessing(
            @PathVariable Long id

    ) {

        return ApiResponse.success(lessonService.cancelAiProcessing(id), "AI processing cancelled successfully");
    }

}
