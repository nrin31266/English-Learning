package com.rin.learningcontentservice.controller.admin;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.SplitSentenceRequest;
import com.rin.learningcontentservice.dto.response.LessonSentenceDetailsResponse;
import com.rin.learningcontentservice.model.LessonSentence;
import com.rin.learningcontentservice.service.SentenceService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/admin/sentences")
@FieldDefaults(makeFinal = true, level = lombok.AccessLevel.PRIVATE)
public class AdminSentenceController {
    SentenceService sentenceService;


    @PostMapping("/{id}/mark-active-inactive")
    public ApiResponse<Void> markSentenceActiveOrInactive(@PathVariable Long id, @RequestParam Boolean active) {
        sentenceService.markSentenceActiveOrInactive(id, active);
        return ApiResponse.success("Sentence marked as " + (Boolean.TRUE.equals(active) ? "active" : "inactive") + " successfully");
    }
    @PostMapping("/{id}/split")
    public ApiResponse<List<LessonSentenceDetailsResponse>> splitSentence(
            @PathVariable Long id,
            @RequestBody SplitSentenceRequest request) {
        return ApiResponse.success(sentenceService.splitSentence(id, request));
    }
}