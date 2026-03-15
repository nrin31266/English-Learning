package com.rin.learningcontentservice.controller.admin;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.service.SentenceService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/admin/sentences")
@PreAuthorize("hasRole('ADMIN')")
@FieldDefaults(makeFinal = true, level = lombok.AccessLevel.PRIVATE)
public class AdminSentenceController {
    SentenceService sentenceService;


    @PostMapping("/{id}/mark-active-inactive")
    public ApiResponse<Void> markSentenceActiveOrInactive(@PathVariable Long id, @RequestParam Boolean active) {
        sentenceService.markSentenceActiveOrInactive(id, active);
        return ApiResponse.success("Sentence marked as " + (Boolean.TRUE.equals(active) ? "active" : "inactive") + " successfully");
    }
}