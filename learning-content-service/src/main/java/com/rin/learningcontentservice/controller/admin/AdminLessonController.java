package com.rin.learningcontentservice.controller.admin;
import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.LessonFilterRequest;
import com.rin.learningcontentservice.dto.response.LessonDetailsResponse;
import com.rin.learningcontentservice.dto.response.LessonSummaryResponse;
import com.rin.learningcontentservice.dto.response.LessonResponse;
import com.rin.learningcontentservice.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/admin/lessons")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminLessonController {

    private final LessonService lessonService;

    @PostMapping
    public ApiResponse<LessonSummaryResponse> generateLessons(
            @RequestBody AddLessonRequest request) {
        return ApiResponse.success(lessonService.addLesson(request));
    }

    @GetMapping
    public ApiResponse<Page<LessonResponse>> getAllLessons(
            LessonFilterRequest filter,
            @PageableDefault(size = 8) Pageable pageable) {
        return ApiResponse.success(lessonService.getAllLessons(filter, pageable));
    }

    @PostMapping("/{id}/retrial")
    public ApiResponse<LessonSummaryResponse> retryLessonGeneration(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") Boolean isRestart) {
        return ApiResponse.success(
                lessonService.retryLessonGeneration(id, isRestart));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteLesson(@PathVariable Long id) {
        lessonService.deleteLesson(id);
        return ApiResponse.success("Lesson deleted successfully");
    }

    @GetMapping("/{slug}")
    public ApiResponse<LessonDetailsResponse> getLessonBySlug(
            @PathVariable String slug
    ) {
        return ApiResponse.success(lessonService.getLessonDetails(slug));
    }

    @PatchMapping("/{id}/cancellation")
    public ApiResponse<LessonSummaryResponse> cancelLessonGeneration(
            @PathVariable Long id
    ){
        return ApiResponse.success(lessonService.cancelLessonGeneration(id));
    }
}