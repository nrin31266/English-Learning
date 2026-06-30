package com.rin.learningcontentservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProgressUpdateResponse {
    private UserLessonProgressDto progress;
    private boolean justCompletedLesson;
}
