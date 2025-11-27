package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.service.SentenceService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/")
@FieldDefaults(makeFinal = true, level = lombok.AccessLevel.PRIVATE)
public class SentenceController {
    SentenceService sentenceService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/sentences/{id}/mark-active-inactive")
    public ApiResponse<Void> markSentenceActiveOrInactive(@PathVariable Long id, @RequestParam Boolean active) {
        sentenceService.markSentenceActiveOrInactive(id, active);
        return ApiResponse.success(null, "Sentence marked as " + (active ? "active" : "inactive") + " successfully");
    }
}
