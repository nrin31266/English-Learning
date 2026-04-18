package com.rin.dictionaryservice.controller.internal;

import com.rin.dictionaryservice.dto.SuccessRequest;
import com.rin.dictionaryservice.model.Word;
import com.rin.dictionaryservice.service.WordService;
import com.rin.englishlearning.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
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
            @RequestParam String key,
            @RequestParam String pos,
            @RequestBody SuccessRequest request
    ) {
        log.info("Received success request for word key: {}, pos: {}, isValid: {}", key, pos, request.getIsValid());
        if (request.getIsValid() != null && !request.getIsValid()) {
            // Từ không hợp lệ → đánh dấu FAILED luôn
            wordService.markFailImmediately(key, pos);
        } else {
            wordService.updateWordToReady(
                    key,
                    pos,
                    request.getSummaryVi(),
                    request.getPhonetics(),
                    request.getCefrLevel(),
                    request.getDefinitions()
            );
        }
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/fail")
    public ApiResponse<Void> fail(@RequestParam String key,
                                  @RequestParam String pos ) {
        log.info("Received fail request for word key: {}, pos: {}", key, pos);
        wordService.markFail(key, pos);

        return ApiResponse.<Void>builder().build();
    }
}