package com.rin.learningcontentservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LessonProgressOverviewDto {
    // Tiến độ của chế độ Shadowing
    private UserLessonProgressDto shadowing;

    // Tiến độ của chế độ Dictation
    private UserLessonProgressDto dictation;


}