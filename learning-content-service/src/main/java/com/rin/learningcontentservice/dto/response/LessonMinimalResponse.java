package com.rin.learningcontentservice.dto.response;

import com.rin.englishlearning.common.constants.LessonType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class LessonMinimalResponse {
    private Long id;
    private String title;
    private String slug;
    private LessonType lessonType;
}
