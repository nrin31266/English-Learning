package com.rin.learningcontentservice.controller.admin;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.AddEditTopicRequest;
import com.rin.learningcontentservice.dto.response.TopicOptionResponse;
import com.rin.learningcontentservice.dto.response.TopicResponseWithLessonCount;
import com.rin.learningcontentservice.service.TopicService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/admin/topics")
public class AdminTopicController {

    private final TopicService topicService;

    @PostMapping
    public ApiResponse<TopicResponseWithLessonCount> addTopic(
            @RequestBody AddEditTopicRequest request
    ) {
        return ApiResponse.success(topicService.addTopic(request));
    }

    @PutMapping("/{slug}")
    public ApiResponse<TopicResponseWithLessonCount> editTopic(
            @PathVariable String slug,
            @RequestBody AddEditTopicRequest request
    ) {
        return ApiResponse.success(topicService.editTopic(slug, request));
    }

    @GetMapping
    public ApiResponse<List<TopicResponseWithLessonCount>> getAllTopics() {
        return ApiResponse.success(topicService.getTopicsForAdmin());
    }

    @GetMapping("/options")
    public ApiResponse<List<TopicOptionResponse>> getTopicOptions() {
        return ApiResponse.success(topicService.getTopicOptions());
    }

    @DeleteMapping("/{slug}")
    public ApiResponse<Void> deleteTopicBySlug(
            @PathVariable String slug
    ) {
        topicService.deleteTopicBySlug(slug);
        return ApiResponse.success("Topic deleted successfully");
    }
}