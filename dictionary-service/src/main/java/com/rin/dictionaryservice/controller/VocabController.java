package com.rin.dictionaryservice.controller;

import com.rin.dictionaryservice.dto.VocabSubTopicResponse;
import com.rin.dictionaryservice.dto.VocabTopicResponse;
import com.rin.dictionaryservice.dto.VocabWordEntryResponse;
import com.rin.dictionaryservice.service.VocabService;
import com.rin.dictionaryservice.service.VocabProgressService;
import com.rin.dictionaryservice.dto.VocabProgressResponse;
import com.rin.dictionaryservice.dto.VocabSessionSubmitRequest;
import com.rin.dictionaryservice.dto.VocabProgressDashboardResponse;
import com.rin.dictionaryservice.dto.VocabReviewQueueResponse;
import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.englishlearning.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/vocab")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class VocabController {

    VocabService vocabService;
    VocabProgressService vocabProgressService;

    @GetMapping("/topics")
    public ApiResponse<PageResponse<VocabTopicResponse>> listTopics(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "newest") String sort
    ) {
        return ApiResponse.<PageResponse<VocabTopicResponse>>builder()
                .result(vocabService.listPublicTopics(q, tags, page, size, sort))
                .build();
    }

    @GetMapping("/topics/{topicId}")
    public ApiResponse<VocabTopicResponse> getTopic(@PathVariable String topicId) {
        return ApiResponse.<VocabTopicResponse>builder()
                .result(vocabService.getTopic(topicId, true))
                .build();
    }

    @GetMapping("/topics/{topicId}/subtopics")
    public ApiResponse<List<VocabSubTopicResponse>> listSubTopics(@PathVariable String topicId) {
        return ApiResponse.<List<VocabSubTopicResponse>>builder()
                .result(vocabService.listSubTopicsForPublic(topicId))
                .build();
    }

    @GetMapping("/subtopics/{subtopicId}/words")
    public ApiResponse<List<VocabWordEntryResponse>> listWords(@PathVariable String subtopicId) {
        return ApiResponse.<List<VocabWordEntryResponse>>builder()
                .result(vocabService.listWordsForPublic(subtopicId))
                .build();
    }

    @GetMapping("/subtopics/{subtopicId}/progress")
    public ApiResponse<VocabProgressResponse> getProgress(@PathVariable String subtopicId) {
        return ApiResponse.<VocabProgressResponse>builder().result(vocabProgressService.getProgress(subtopicId)).build();
    }

    @PostMapping("/subtopics/{subtopicId}/progress/sessions")
    public ApiResponse<VocabProgressResponse> submitSession(
            @PathVariable String subtopicId, @Valid @RequestBody VocabSessionSubmitRequest request) {
        return ApiResponse.<VocabProgressResponse>builder()
                .result(vocabProgressService.submitSession(subtopicId, request)).build();
    }

    @GetMapping("/progress/dashboard")
    public ApiResponse<VocabProgressDashboardResponse> getDashboard() {
        return ApiResponse.<VocabProgressDashboardResponse>builder().result(vocabProgressService.getDashboard()).build();
    }

    @GetMapping("/progress/review")
    public ApiResponse<VocabReviewQueueResponse> getReviewQueue(@RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.<VocabReviewQueueResponse>builder().result(vocabProgressService.getReviewQueue(limit)).build();
    }

    @PostMapping("/progress/review/sessions")
    public ApiResponse<VocabProgressResponse> submitReviewSession(@Valid @RequestBody VocabSessionSubmitRequest request) {
        return ApiResponse.<VocabProgressResponse>builder().result(vocabProgressService.submitReviewSession(request)).build();
    }
}
