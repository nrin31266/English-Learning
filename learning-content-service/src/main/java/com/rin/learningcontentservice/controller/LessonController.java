package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.englishlearning.common.exception.BaseException;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.EditLessonRequest;
import com.rin.learningcontentservice.dto.request.LessonFilterRequest;
import com.rin.learningcontentservice.dto.response.LessonDetailsResponse;
import com.rin.learningcontentservice.dto.response.LessonMinimalResponse;
import com.rin.learningcontentservice.dto.response.LessonResponse;
import com.rin.learningcontentservice.exception.LearningContentErrorCode;
import com.rin.learningcontentservice.model.Lesson;
import com.rin.learningcontentservice.service.LessonService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.LocalDateTime;

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

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/lessons/{id}")
    public ApiResponse<Void> deleteLesson(
            @PathVariable Long id
    ) {
        lessonService.deleteLesson(id);
        return ApiResponse.success(null, "Lesson deleted successfully");
    }
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/lessons/{id}")
    public ApiResponse<LessonResponse> updateLesson(
            @PathVariable Long id,
            @RequestBody EditLessonRequest request
    ) {
        return ApiResponse.success(lessonService.updateLesson(id, request), "Lesson updated successfully");
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/lessons/{id}/publish")
    public ApiResponse<Void> publishLesson(
            @PathVariable Long id
    ) {
        lessonService.publishOrUnpublishLesson(id, true);
        return ApiResponse.success(null, "Lesson published successfully");
    }
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/lessons/{id}/unpublish")
    public ApiResponse<Void> unpublishLesson(
            @PathVariable Long id
    ) {
        lessonService.publishOrUnpublishLesson(id, false);
        return ApiResponse.success(null, "Lesson unpublished successfully");
    }

    @GetMapping("/learner/lessons/{slug}")
    public ApiResponse<LessonDetailsResponse> getLessonDetailsForLearner(
            @PathVariable String slug
    ) {
        return ApiResponse.success(lessonService.getLessonDetails(slug));
    }

}
