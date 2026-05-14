package com.rin.dictionaryservice.controller;

import com.rin.dictionaryservice.dto.*;
import com.rin.dictionaryservice.service.VocabService;
import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.englishlearning.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/vocab")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class VocabAdminController {

    VocabService vocabService;

    // ─── TOPICS ──────────────────────────────────────────────────────────────

    @PostMapping("/topics")
    public ApiResponse<VocabTopicResponse> createTopic(@RequestBody CreateVocabTopicRequest req) {
        return ApiResponse.<VocabTopicResponse>builder()
                .result(vocabService.createTopic(req))
                .build();
    }

    @GetMapping("/topics")
    public ApiResponse<PageResponse<VocabTopicResponse>> listTopics(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "newest") String sort
    ) {
        return ApiResponse.<PageResponse<VocabTopicResponse>>builder()
                .result(vocabService.listTopics(q, tags, status, page, size, sort))
                .build();
    }

    @GetMapping("/topics/{topicId}")
    public ApiResponse<VocabTopicResponse> getTopic(@PathVariable String topicId) {
        return ApiResponse.<VocabTopicResponse>builder()
                .result(vocabService.getTopic(topicId))
                .build();
    }

    @PutMapping("/topics/{topicId}")
    public ApiResponse<VocabTopicResponse> updateTopic(
            @PathVariable String topicId,
            @RequestBody UpdateVocabTopicRequest req) {
        return ApiResponse.<VocabTopicResponse>builder()
                .result(vocabService.updateTopic(topicId, req))
                .build();
    }

    @DeleteMapping("/topics/{topicId}")
    public ApiResponse<String> deleteTopic(@PathVariable String topicId) {
        vocabService.deleteTopic(topicId);
        return ApiResponse.<String>builder().result("deleted").build();
    }

    @PostMapping("/topics/{topicId}/generate-subtopics")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<VocabTopicResponse> generateSubTopics(@PathVariable String topicId) {
        VocabTopicResponse accepted = vocabService.acceptGenerateSubTopics(topicId);
        vocabService.generateSubTopicsAsync(topicId);
        return ApiResponse.<VocabTopicResponse>builder().result(accepted).build();
    }

    // ─── SUBTOPICS ───────────────────────────────────────────────────────────

    @GetMapping("/topics/{topicId}/subtopics")
    public ApiResponse<List<VocabSubTopicResponse>> listSubTopics(@PathVariable String topicId) {
        return ApiResponse.<List<VocabSubTopicResponse>>builder()
                .result(vocabService.listSubTopics(topicId))
                .build();
    }

    @PostMapping("/subtopics/{subtopicId}/generate-words")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<VocabSubTopicResponse> generateWords(@PathVariable String subtopicId) {
        VocabSubTopicResponse accepted = vocabService.acceptGenerateWords(subtopicId);
        vocabService.generateWordsAsync(subtopicId);
        return ApiResponse.<VocabSubTopicResponse>builder().result(accepted).build();
    }

    @GetMapping("/subtopics/{subtopicId}/words")
    public ApiResponse<List<VocabWordEntryResponse>> listWords(@PathVariable String subtopicId) {
        return ApiResponse.<List<VocabWordEntryResponse>>builder()
                .result(vocabService.listWords(subtopicId))
                .build();
    }

    @DeleteMapping("/subtopics/{subtopicId}")
    public ApiResponse<String> deleteSubTopic(@PathVariable String subtopicId) {
        vocabService.deleteSubTopic(subtopicId);
        return ApiResponse.<String>builder().result("deleted").build();
    }

    @DeleteMapping("/subtopics/{subtopicId}/words")
    public ApiResponse<String> deleteAllWordsInSubTopic(@PathVariable String subtopicId) {
        vocabService.deleteAllWordsInSubTopic(subtopicId);
        return ApiResponse.<String>builder().result("deleted").build();
    }

    @PostMapping("/topics/{topicId}/recalculate")
    public ApiResponse<String> recalculateTopic(@PathVariable String topicId) {
        vocabService.recalculateTopic(topicId);
        return ApiResponse.<String>builder().result("recalculated").build();
    }

    // ─── IMAGE UPLOAD (proxied to language-processing-service) ─────────────────
    @PostMapping("/topics/{topicId}/upload-image")
    public ApiResponse<String> uploadTopicImage(
            @PathVariable String topicId,
            @RequestParam("file") MultipartFile file) {
        String publicId = "vocab_topic_" + topicId;
        String url = vocabService.uploadTopicImage(publicId, file);
        return ApiResponse.<String>builder().result(url).build();
    }

    // ─── TOGGLE ACTIVE ───────────────────────────────────────────────────────

    @PutMapping("/topics/{topicId}/toggle-active")
    public ApiResponse<VocabTopicResponse> toggleTopicActive(@PathVariable String topicId) {
        return ApiResponse.<VocabTopicResponse>builder()
                .result(vocabService.toggleTopicActive(topicId))
                .build();
    }

    @PutMapping("/subtopics/{subtopicId}/toggle-active")
    public ApiResponse<VocabSubTopicResponse> toggleSubtopicActive(@PathVariable String subtopicId) {
        return ApiResponse.<VocabSubTopicResponse>builder()
                .result(vocabService.toggleSubtopicActive(subtopicId))
                .build();
    }

    // ─── HUMAN-IN-THE-LOOP ─────────────────────────────────────────────────

    @PutMapping("/word-entries/{entryId}/context")
    public ApiResponse<VocabWordEntryResponse> updateEntryContext(
            @PathVariable String entryId,
            @RequestBody UpdateEntryContextRequest req) {
        return ApiResponse.<VocabWordEntryResponse>builder()
                .result(vocabService.updateEntryContextManual(entryId, req))
                .build();
    }

    @PostMapping("/word-entries/{entryId}/generate-meaning")
    public ApiResponse<VocabWordEntryResponse> generateMeaning(
            @PathVariable String entryId) {
        return ApiResponse.<VocabWordEntryResponse>builder()
                .result(vocabService.generateSingleMeaningSync(entryId))
                .build();
    }

}
