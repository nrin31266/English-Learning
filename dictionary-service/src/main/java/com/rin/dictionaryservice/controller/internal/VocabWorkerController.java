package com.rin.dictionaryservice.controller.internal;

import com.rin.dictionaryservice.dto.WordReadyRequest;
import com.rin.dictionaryservice.service.VocabService;
import com.rin.englishlearning.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/internal/vocab")
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class VocabWorkerController {
    VocabService  vocabService;
    // ─── INTERNAL: called by Python worker ───────────────────────────────────

    /**
     * Internal endpoint called by the Python worker after processing a Word
     * (fetching dictionary data, generating definitions, etc.).
     * Triggers onWordReady → VocabWordEntry.wordReady=true →
     * checkSubTopicCompletion → checkTopicCompletion → Kafka event → STOMP → UI.
     */
    @PostMapping("/words-ready")
    public ApiResponse<String> onWordReady(@RequestBody WordReadyRequest req) {
        log.info("[VocabInternal] Word ready: key={}, pos={}", req.getWordKey(), req.getPos());
        vocabService.onWordReady(req.getWordKey(), req.getPos());
        return ApiResponse.<String>builder().result("ok").build();
    }
}
