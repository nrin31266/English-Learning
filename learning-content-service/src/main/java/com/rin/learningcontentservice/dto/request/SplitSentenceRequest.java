package com.rin.learningcontentservice.dto.request;


import lombok.*;
import lombok.experimental.FieldDefaults;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SplitSentenceRequest {
    Long splitAfterWordId;
    SplitSentenceRequest.SentenceData sentence1;
    SplitSentenceRequest.SentenceData sentence2;

    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class SentenceData {
        String textDisplay;
        String translationVi;
        String phoneticUs;
    }
}