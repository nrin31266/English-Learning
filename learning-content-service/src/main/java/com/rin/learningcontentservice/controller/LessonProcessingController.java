package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.ProgressBatchRequest;
import com.rin.learningcontentservice.dto.request.ProgressUpdateRequest;
import com.rin.learningcontentservice.service.LessonProcessingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/process")
public class LessonProcessingController {

    private final LessonProcessingService lessonProcessingService;

    /**
     * API cập nhật tiến độ học tập dùng chung cho mọi chế độ học (Shadowing, Dictation...)
     * @param request chứa lessonId, sentenceId, mode, score
     */
    @PutMapping("/progress")
    public ResponseEntity<Void> updateProgress(@Valid @RequestBody ProgressUpdateRequest request) {
        // Gọi service xử lý logic lưu Database âm thầm
        lessonProcessingService.updateProgress(request);

        return ApiResponse.noContent();
    }

    @PutMapping("/progress/batch")
    public ResponseEntity<Void> updateBatchProgress(@Valid @RequestBody ProgressBatchRequest request) {
        // Đẩy qua service xử lý một lượt
        lessonProcessingService.updateBatchProgress(request);

        return ApiResponse.noContent();
    }
}