package com.rin.dictionaryservice.controller;

import com.rin.dictionaryservice.model.DictionaryWord;
import com.rin.dictionaryservice.service.DictionaryWordService;
import com.rin.englishlearning.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RequiredArgsConstructor
@RestController
@RequestMapping("/")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class DictionaryWordController {
    DictionaryWordService dictionaryWordService;

    @PreAuthorize( "hasRole('ADMIN')" )
    @PostMapping("/words/resume-queue")
    public ApiResponse resumeQueue() {
        dictionaryWordService.resumeQueue();
        return ApiResponse.success(null, "Resumed dictionary word processing queue");
    }
    @PreAuthorize( "hasRole('ADMIN')" )
    @PostMapping("/words/pause-queue")
    public ApiResponse pauseQueue() {
        dictionaryWordService.pauseQueue();
        return ApiResponse.success(null, "Paused dictionary word processing queue");
    }
    @PreAuthorize( "hasRole('ADMIN')" )
    @GetMapping("/words/queue-view")
    public ApiResponse<Map<String, Object>> queueView() {
        Map<String, Object> queueView = dictionaryWordService.queueView(9999);
        return ApiResponse.success(queueView, "Fetched dictionary word queue view");
    }
    @PreAuthorize( "hasRole('ADMIN')" )
    @PostMapping("/words")
    public ApiResponse<String> addWord(@RequestBody String wordKey) {
        return ApiResponse.success(dictionaryWordService.addWordToQueue(wordKey), "Word added to processing queue");
    }
    @PostMapping("/words/add-or-get-word")
    public ApiResponse<DictionaryWord> addOrGetWord(@RequestBody String wordKey) {
        DictionaryWord word = dictionaryWordService.addOrGetWord(wordKey);
        if (word != null) {
            return ApiResponse.success(word, "Word found in dictionary");
        } else {
            return ApiResponse.success(null, "Word not found, added to processing queue");
        }
    }
}
