package com.rin.dictionaryservice.controller;

import com.rin.dictionaryservice.dto.VocabSubTopicResponse;
import com.rin.dictionaryservice.dto.VocabTopicResponse;
import com.rin.dictionaryservice.dto.VocabWordEntryResponse;
import com.rin.dictionaryservice.service.VocabService;
import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.englishlearning.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/vocab")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class VocabController {

    VocabService vocabService;

    @GetMapping("/topics")
    public ApiResponse<PageResponse<VocabTopicResponse>> listTopics(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "true") boolean activeOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "newest") String sort
    ) {
        return ApiResponse.<PageResponse<VocabTopicResponse>>builder()
                .result(vocabService.listTopics(q, tags, status, activeOnly, page, size, sort))
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
}

