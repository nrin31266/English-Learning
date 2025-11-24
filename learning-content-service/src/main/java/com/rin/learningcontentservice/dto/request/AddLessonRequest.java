package com.rin.learningcontentservice.dto.request;

import com.rin.englishlearning.common.constants.CefrLevel;
import com.rin.englishlearning.common.constants.LessonSourceType;
import com.rin.englishlearning.common.constants.LessonType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class AddLessonRequest {
    private String topicSlug;
    private String title;
    private LessonType lessonType;
    private String description;
    private CefrLevel languageLevel;
    private LessonSourceType sourceType;
    private String sourceLanguage;
    private String inputSourceUrl;
    private String thumbnailUrl;
    private Boolean enableDictation;
    private Boolean enableShadowing;
}
