package com.rin.learningcontentservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressItem {
    private Double bestScore;
    private Double latestScore;
    private Integer attemptCount;
    private Long firstCompletedAt;
    private Long lastPracticedAt;
}
