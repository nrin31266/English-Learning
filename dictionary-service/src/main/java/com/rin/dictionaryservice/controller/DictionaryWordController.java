package com.rin.dictionaryservice.controller;

import com.rin.dictionaryservice.model.DictionaryWord;
import com.rin.dictionaryservice.service.DictionaryWordService;
import com.rin.englishlearning.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/dictionary-words")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class DictionaryWordController {
    DictionaryWordService dictionaryWordService;

    @PostMapping("/resume-queue")
    public ApiResponse resumeQueue() {
        dictionaryWordService.resumeQueue();
        return ApiResponse.success(null, "Resumed dictionary word processing queue");
    }
    @PostMapping("/pause-queue")
    public ApiResponse pauseQueue() {
        dictionaryWordService.pauseQueue();
        return ApiResponse.success(null, "Paused dictionary word processing queue");
    }
    @PostMapping("/queue-view")
    public ApiResponse<Map<String, Object>> queueView() {
        Map<String, Object> queueView = dictionaryWordService.queueView(9999);
        return ApiResponse.success(queueView, "Fetched dictionary word queue view");
    }
    @GetMapping("/recently-added")
    public ApiResponse<List<DictionaryWord>> getRecentlyAddedWords() {
        List<DictionaryWord> words = dictionaryWordService.getRecentlyAddedWords(50);
        return ApiResponse.success(words, "Fetched recently added dictionary words");
    }
    @PostMapping("/add-or-get-word")
    public ApiResponse<DictionaryWord> addOrGetWord(String wordKey) {
        DictionaryWord word = dictionaryWordService.addOrGetWord(wordKey);
        if (word != null) {
            return ApiResponse.success(word, "Word found in dictionary");
        } else {
            return ApiResponse.success(null, "Word not found, added to processing queue");
        }
    }
}
