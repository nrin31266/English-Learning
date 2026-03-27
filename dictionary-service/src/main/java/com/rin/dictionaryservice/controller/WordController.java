package com.rin.dictionaryservice.controller;

import com.rin.dictionaryservice.dto.SpaCyWordAnalysisDto;
import com.rin.dictionaryservice.dto.SpaCyWordAnalysisRequest;
import com.rin.dictionaryservice.dto.WordSearchRequest;
import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.repository.httpclient.LanguageProcessingClient;
import com.rin.dictionaryservice.service.WordService;
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
    public ApiResponse<Word> addOrGetWord(@RequestBody WordSearchRequest request) {
        SpaCyWordAnalysisDto analysis = languageProcessingClient.analyzeWord(
                new SpaCyWordAnalysisRequest(request.getWord(), request.getContext())
        ).getResult();
        return ApiResponse.success(wordService.addOrGetWord(analysis.getLemma() + "_" +analysis.getPos() , analysis));
    }
}
