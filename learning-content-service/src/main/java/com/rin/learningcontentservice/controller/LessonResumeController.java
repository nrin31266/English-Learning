package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.response.ResumeLearningResponse;
import com.rin.learningcontentservice.service.TopicService;
import com.rin.learningcontentservice.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
@RequestMapping("/lessons")
public class LessonResumeController {

    private final TopicService topicService;

    @GetMapping("/resume")
    public ApiResponse<ResumeLearningResponse> getResumeLessons(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        String userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(
                topicService.getResumeLearningPaginated(userId, page, size)
        );
    }
}
