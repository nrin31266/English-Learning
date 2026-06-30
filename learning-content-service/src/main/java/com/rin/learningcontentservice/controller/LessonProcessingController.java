package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.ProgressBatchRequest;
import com.rin.learningcontentservice.dto.request.ProgressUpdateRequest;
import com.rin.learningcontentservice.dto.response.ProgressUpdateResponse;
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
    public ResponseEntity<ApiResponse<ProgressUpdateResponse>> updateProgress(@Valid @RequestBody ProgressUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(lessonProcessingService.updateProgress(request)));
    }

    @PutMapping("/progress/batch")
    public ResponseEntity<ApiResponse<ProgressUpdateResponse>> updateBatchProgress(@Valid @RequestBody ProgressBatchRequest request) {
        return ResponseEntity.ok(ApiResponse.success(lessonProcessingService.updateBatchProgress(request)));
    }
}
