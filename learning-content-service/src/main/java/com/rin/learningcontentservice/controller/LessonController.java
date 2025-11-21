package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.AddLessonRequest;
import com.rin.learningcontentservice.dto.response.LessonMinimalResponse;
import com.rin.learningcontentservice.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
