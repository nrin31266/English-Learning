package com.rin.dictionaryservice.dto.progress;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BatchProgressRequest {
    List<ProgressEntry> entries;
    String topicId;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ProgressEntry {
        String wordEntryId;
        String subtopicId;
        String status;
        int correctCount;
        int wrongCount;
        long lastReviewedAt;
    }
}
