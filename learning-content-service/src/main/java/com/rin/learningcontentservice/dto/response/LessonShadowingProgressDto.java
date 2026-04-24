package com.rin.learningcontentservice.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class LessonShadowingProgressDto {
    private Long id;
    private String userId;
    private Long lessonId;
    private Integer lessonVersion;
    private Integer completedSentences;
    private Integer totalSentences;
    private Boolean completed;
    private Instant updatedAt;
    private Instant createdAt;

    // 👉 Sentence attempts với các field mới (không còn scores list)
    private List<SentenceShadowingAttemptDto> sentenceAttempts;

    @Data
    @Builder
    public static class SentenceShadowingAttemptDto {
        private Long id;
        private Long sentenceId;
        private Boolean completed;
        private Double bestScore;          // 👈 ĐIỂM CAO NHẤT
        private Double bestFluency;        // 👈 FLUENCY CAO NHẤT
        private Instant createdAt;
        private Instant updatedAt;
    }

    // ❌ XÓA HOÀN TOÀN lớp SentenceShadowingScoreDto
}