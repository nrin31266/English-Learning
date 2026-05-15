package com.rin.dictionaryservice.controller;

import com.rin.dictionaryservice.dto.admin.*;
import com.rin.dictionaryservice.service.AdminDictionaryService;
import com.rin.englishlearning.common.dto.ApiResponse;
import com.rin.englishlearning.common.dto.PageResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/dictionary/words")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminDictionaryController {

    AdminDictionaryService adminDictionaryService;

    @GetMapping
    public ApiResponse<PageResponse<AdminWordResponse>> listWords(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String pos,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean used,
            @RequestParam(required = false, defaultValue = "false") boolean deepFields,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updatedDesc") String sort
    ) {
        return ApiResponse.<PageResponse<AdminWordResponse>>builder()
                .result(adminDictionaryService.listWords(q, pos, status, used, deepFields, page, size, sort))
                .build();
    }

    @GetMapping("/{wordId}")
    public ApiResponse<AdminWordDetailResponse> getWordDetail(@PathVariable String wordId) {
        return ApiResponse.<AdminWordDetailResponse>builder()
                .result(adminDictionaryService.getWordDetail(wordId))
                .build();
    }

    @PostMapping
    public ApiResponse<AdminWordDetailResponse> createWord(@RequestBody CreateAdminWordRequest request) {
        return ApiResponse.<AdminWordDetailResponse>builder()
                .result(adminDictionaryService.createWordAsPending(request))
                .build();
    }

    @PutMapping("/{wordId}")
    public ApiResponse<AdminWordDetailResponse> updateWord(
            @PathVariable String wordId,
            @RequestBody UpdateAdminWordRequest request
    ) {
        return ApiResponse.<AdminWordDetailResponse>builder()
                .result(adminDictionaryService.updateWordBasic(wordId, request))
                .build();
    }

    @PutMapping("/{wordId}/definitions")
    public ApiResponse<AdminWordDetailResponse> updateDefinitions(
            @PathVariable String wordId,
            @RequestBody UpdateWordDefinitionsRequest request
    ) {
        return ApiResponse.<AdminWordDetailResponse>builder()
                .result(adminDictionaryService.updateDefinitions(wordId, request))
                .build();
    }

    @PatchMapping("/{wordId}/definitions/{index}")
    public ApiResponse<AdminWordDetailResponse> patchDefinition(
            @PathVariable String wordId,
            @PathVariable int index,
            @RequestBody PatchWordDefinitionRequest request
    ) {
        return ApiResponse.<AdminWordDetailResponse>builder()
                .result(adminDictionaryService.patchDefinition(wordId, index, request))
                .build();
    }

    @DeleteMapping("/{wordId}")
    public ApiResponse<String> deleteWord(@PathVariable String wordId) {
        adminDictionaryService.deleteWord(wordId);
        return ApiResponse.<String>builder().result("deleted").build();
    }

    @PostMapping("/{wordId}/regenerate")
    public ApiResponse<AdminWordDetailResponse> regenerateWord(
            @PathVariable String wordId,
            @RequestBody(required = false) RegenerateWordRequest request
    ) {
        return ApiResponse.<AdminWordDetailResponse>builder()
                .result(adminDictionaryService.regenerateWord(wordId, request == null ? new RegenerateWordRequest() : request))
                .build();
    }

    @GetMapping("/{wordId}/entries")
    public ApiResponse<PageResponse<WordEntryUsageResponse>> listWordEntries(
            @PathVariable String wordId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean onlyReady
    ) {
        return ApiResponse.<PageResponse<WordEntryUsageResponse>>builder()
                .result(adminDictionaryService.listWordUsages(wordId, page, size, onlyReady))
                .build();
    }
}
