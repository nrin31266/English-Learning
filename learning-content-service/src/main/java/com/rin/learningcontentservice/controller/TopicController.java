package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.response.TopicSummaryResponse;
import com.rin.learningcontentservice.service.TopicService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/topics")
public class TopicController {

    private final TopicService topicService;

    @GetMapping("/active")
    public ApiResponse<List<TopicSummaryResponse>> getActiveTopics() {
        return ApiResponse.success(topicService.getActiveTopics());
    }

}
