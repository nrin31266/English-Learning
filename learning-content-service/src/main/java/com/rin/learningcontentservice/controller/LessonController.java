package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.LessonFilterRequest;
import com.rin.learningcontentservice.dto.response.LessonDetailsResponse;
import com.rin.learningcontentservice.dto.response.LessonResponse;
import com.rin.learningcontentservice.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/lessons")
public class LessonController {
    private final LessonService lessonService;

    @GetMapping("/{slug}")
    public ApiResponse<LessonDetailsResponse> getLessonDetails(
            @PathVariable String slug, @RequestParam(value = "mode", defaultValue = "NONE") String mode ) {
        return ApiResponse.success(lessonService.getLessonDetailsWithoutInActivateSentences(slug, mode));
    }

}
