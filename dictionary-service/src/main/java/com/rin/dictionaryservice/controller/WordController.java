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


    @PostMapping
    public ApiResponse<WordResponse> addOrGetWord(@RequestBody WordSearchRequest request) {



        return ApiResponse.success(
                wordService.addOrGetWord(TextUtils.canonicalForm(request.getText()), request)
        );
    }
}
