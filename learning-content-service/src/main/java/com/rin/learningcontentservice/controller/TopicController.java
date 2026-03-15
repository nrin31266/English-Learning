package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.response.HomeTopicsResponse;
import com.rin.learningcontentservice.dto.response.TopicDetailsResponse;
import com.rin.learningcontentservice.service.TopicService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/topics")
public class TopicController {

    private final TopicService topicService;

    @GetMapping("/home")
    public ApiResponse<HomeTopicsResponse> getHomeTopics(
            @RequestParam(defaultValue = "4") int limitLessonsPerTopic,
            @RequestParam(defaultValue = "10") int limitTopics
    ) {
        return ApiResponse.success(
                topicService.getTopicsForHome(limitTopics, limitLessonsPerTopic)
        );
    }

    @GetMapping("/{slug}")
    public ApiResponse<TopicDetailsResponse> getTopicBySlug(
            @PathVariable String slug
    ) {
        return ApiResponse.success(topicService.getTopicDetailsBySlug(slug));
    }
}