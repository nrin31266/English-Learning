package com.rin.dictionaryservice.controller;

import com.rin.dictionaryservice.dto.SpaCyWordAnalysisDto;
import com.rin.dictionaryservice.dto.SpaCyWordAnalysisRequest;
import com.rin.dictionaryservice.dto.WordResponse;
import com.rin.dictionaryservice.dto.WordSearchRequest;
import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.repository.httpclient.LanguageProcessingClient;
import com.rin.dictionaryservice.service.WordService;
import com.rin.dictionaryservice.utils.TextUtils;
import com.rin.englishlearning.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/words")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class WordController {
    WordService wordService;
    LanguageProcessingClient  languageProcessingClient;

    @PostMapping
    public ApiResponse<WordResponse> addOrGetWord(@RequestBody WordSearchRequest request) {

        String originalWord = request.getWord();

        // ✅ normalize
        String cleanedWord = TextUtils.normalizeWord(originalWord);

        SpaCyWordAnalysisDto analysis = languageProcessingClient.analyzeWord(
                new SpaCyWordAnalysisRequest(cleanedWord, request.getContext())
        ).getResult();

        return ApiResponse.success(
                wordService.addOrGetWord(cleanedWord.toLowerCase(), analysis, request.getContext())
        );
    }
}
