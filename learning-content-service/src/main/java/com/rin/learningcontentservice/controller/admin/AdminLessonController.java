package com.rin.learningcontentservice.controller.admin;
import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.request.EditLessonRequest;
import com.rin.learningcontentservice.dto.request.LessonFilterRequest;
import com.rin.learningcontentservice.dto.response.LessonDetailsResponse;
import com.rin.learningcontentservice.dto.response.LessonSummaryResponse;
import com.rin.learningcontentservice.dto.response.LessonResponse;
import com.rin.learningcontentservice.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/admin/lessons")
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

    @GetMapping("/{id}")
    public ApiResponse<LessonDetailsResponse> getLessonById(
            @PathVariable Long id
    ) {
        return ApiResponse.success(lessonService.getLessonDetails(id));
    }

    @PatchMapping("/{id}/cancellation")
    public ApiResponse<LessonSummaryResponse> cancelLessonGeneration(
            @PathVariable Long id
    ){
        return ApiResponse.success(lessonService.cancelLessonGeneration(id));
    }

    @PatchMapping("/{id}/unpublish")
    public ApiResponse<Void> unpublishLesson(
            @PathVariable Long id
    ){
        lessonService.publishOrUnpublishLesson(id, false);
        return ApiResponse.success(
                "Lesson unpublished successfully"
        );
    }
    @PatchMapping("/{id}/publish")
    public ApiResponse<Void> publishLesson(
            @PathVariable Long id
    ){
        lessonService.publishOrUnpublishLesson(id, true);
        return ApiResponse.success(
                "Lesson published successfully"
        );
    }

    @PutMapping("/{id}")
    public ApiResponse<LessonResponse> updateLesson(
            @PathVariable Long id,
            @RequestBody EditLessonRequest request
    ) {
        return ApiResponse.success(lessonService.updateLesson(id, request), "Lesson updated successfully");
    }
}