package com.rin.learningcontentservice.controller;

import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.learningcontentservice.dto.request.AddEditTopicRequest;
import com.rin.learningcontentservice.dto.response.LHomeResponse;
import com.rin.learningcontentservice.dto.response.LTopicResponse;
import com.rin.learningcontentservice.dto.response.TopicMinimalResponse;
import com.rin.learningcontentservice.dto.response.TopicResponse;
import com.rin.learningcontentservice.service.TopicService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/")
public class TopicController {

    private final TopicService topicService;


    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/topics")
    public ApiResponse<TopicResponse> addTopic(
            @RequestBody AddEditTopicRequest request
            ){
        return ApiResponse.success(topicService.addTopic(request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/topics/{slug}")
    public ApiResponse<TopicResponse> editTopic(
            @PathVariable String slug,
            @RequestBody AddEditTopicRequest request
    ) {
        return ApiResponse.success(topicService.editTopic(slug, request));
    }

    @GetMapping("/admin/topics")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<TopicResponse>> getAdminTopics() {
        return ApiResponse.success(topicService.getAdminTopics());
    }

    @GetMapping("/topics/minimals")
    public ApiResponse<List<TopicMinimalResponse>> getTopicMinimals() {
        return ApiResponse.success(topicService.getTopicMinimals());
    }

    @DeleteMapping("/topics/{slug}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteTopicBySlug(
            @PathVariable String slug
    ) {
        topicService.deleteTopicBySlug(slug);
        return ApiResponse.success(null, "Topic deleted successfully");
    }


    @GetMapping("/learner/home/topics")
    public ApiResponse<LHomeResponse> getTopicsForLearnerHome(
            @RequestParam (defaultValue = "4") int limitLessonsPerTopic,
            @RequestParam (defaultValue = "10") int limitTopics
    ){
        return ApiResponse.success(topicService.getTopicsForLearnerHome(limitTopics, limitLessonsPerTopic));
    }

    @GetMapping("/learner/topics/{slug}")
    public ApiResponse<LTopicResponse> getLeanerTopicBySlug(
            @PathVariable String slug
    ){
        return ApiResponse.success(topicService.getLeanerTopicBySlug(slug));
    }
}
