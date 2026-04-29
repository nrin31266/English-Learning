package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.ProgressUpdateRequest;
import com.rin.learningcontentservice.service.LessonProcessingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/process") // Đã bỏ dấu '/' ở cuối cho chuẩn RESTful
public class LessonProcessingController {

    private final LessonProcessingService lessonProcessingService;

    /**
     * API cập nhật tiến độ học tập dùng chung cho mọi chế độ học (Shadowing, Dictation...)
     * @param request chứa lessonId, sentenceId, mode, score
     */
    @PutMapping("/progress")
    public ApiResponse<Void> updateProgress(@Valid @RequestBody ProgressUpdateRequest request) {

        // Gọi service xử lý logic lưu Database âm thầm
        lessonProcessingService.updateProgress(request);

        // Trả về HTTP 200 OK thành công, không cần data rườm rà vì frontend đã Optimistic UI
        return ApiResponse.success(null);
    }
}