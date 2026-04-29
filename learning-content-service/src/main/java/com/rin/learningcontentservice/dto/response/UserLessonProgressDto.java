package com.rin.learningcontentservice.dto.response;

import com.rin.learningcontentservice.model.ProgressStatus;
import lombok.Builder;
import lombok.Data;
import java.util.Set;

@Data
@Builder
public class UserLessonProgressDto {
    private String mode;
    private ProgressStatus status;
    private Set<Long> completedSentenceIds;
    private int totalCompletedSentences;
}