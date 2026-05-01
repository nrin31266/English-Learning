package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.response.HomeTopicsResponse;
import com.rin.learningcontentservice.dto.response.TopicDetailsResponse;
import com.rin.learningcontentservice.service.TopicService;
import com.rin.learningcontentservice.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/topics")
public class TopicController {

    private final TopicService topicService;

    @GetMapping("/home")
    public ApiResponse<HomeTopicsResponse> getHomeTopics(
            @RequestParam(defaultValue = "8") int limitLessonsPerTopic,
            @RequestParam(defaultValue = "10") int limitTopics
    ) {
        String userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(
                topicService.getTopicsForHome(limitTopics, limitLessonsPerTopic, userId)
        );
    }

    @GetMapping("/{slug}")
    public ApiResponse<TopicDetailsResponse> getTopicBySlug(
            @PathVariable String slug
    ) {
        // Lấy userId để check progress nếu người dùng đã đăng nhập
        String userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(topicService.getTopicDetailsBySlug(slug, userId));
    }
}