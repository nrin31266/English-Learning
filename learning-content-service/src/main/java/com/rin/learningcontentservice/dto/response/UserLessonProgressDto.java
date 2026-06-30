package com.rin.learningcontentservice.dto.response;

import com.rin.learningcontentservice.model.ProgressStatus;
import com.rin.learningcontentservice.model.ProgressItem;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class UserLessonProgressDto {
    private String mode;
    private ProgressStatus status;
    private Map<Long, ProgressItem> progressItems;
    private Double lessonScore;
    private Integer completedSentenceCount;
    private Integer totalSentenceCount;
    private Long completedAt;
}
