package com.rin.dictionaryservice.controller;


import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import com.rin.dictionaryservice.model.VocabTag;
import com.rin.dictionaryservice.repository.VocabTagRepository;
import com.rin.englishlearning.common.dto.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/vocab-tags")
@RequiredArgsConstructor
public class VocabTagController {

    private final VocabTagRepository vocabTagRepository;

    @GetMapping
    public ApiResponse<List<VocabTag>> getActiveTags() {
        return ApiResponse.<List<VocabTag>>builder()
                .result(vocabTagRepository.findByIsActiveTrueOrderBySortOrderAsc())
                .build();
    }
}
