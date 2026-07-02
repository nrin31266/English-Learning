package com.rin.dictionaryservice.model;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserVocabWordProgress {
    String wordId;
    VocabReviewRating reviewRating;
    int masteryScore;
    int bestRewardedScore;
    @Builder.Default Set<VocabLearningMode> completedModes = new HashSet<>();
    int attemptCount;
    Instant firstStudiedAt;
    Instant lastStudiedAt;
    Instant nextReviewAt;
}
