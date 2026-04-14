package com.rin.dictionaryservice.controller.internal;

import com.rin.dictionaryservice.dto.SuccessRequest;
import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.service.WordService;
import com.rin.englishlearning.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/internal/words")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class InternalWordController {

    WordService wordService;

    @PostMapping("/claim")
    public ApiResponse<List<Word>> claim(
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam String workerId
    ) {
        List<Word> jobs = wordService.claimBatch(limit, workerId);
        return ApiResponse.<List<Word>>builder()
                .result(jobs)
                .build();
    }

    @PostMapping("/success")
    public ApiResponse<Void> success(
            @RequestParam String textLower,
            @RequestParam String pos,
            @RequestBody SuccessRequest request
    ) {
        if (request.getIsValid() != null && !request.getIsValid()) {
            // Từ không hợp lệ → đánh dấu FAILED luôn
            wordService.markFailImmediately(textLower, pos);
        } else {
            wordService.updateWordToReady(
                    textLower,
                    pos,
                    request.getSummaryVi(),
                    request.getPhonetics(),
                    request.getDefinitions()
            );
        }
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/fail")
    public ApiResponse<Void> fail(@RequestParam String wordId) {

        wordService.markFail(wordId);

        return ApiResponse.<Void>builder().build();
    }
}