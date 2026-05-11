package com.rin.learningcontentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResumeLearningResponse {
    private int totalInProgress;
    private boolean hasMore;
    private List<ResumeLessonDto> recentLessons;
}
