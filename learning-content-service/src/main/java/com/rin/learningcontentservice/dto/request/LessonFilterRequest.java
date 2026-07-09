package com.rin.learningcontentservice.dto.request;

import com.rin.englishlearning.common.constants.CefrLevel;
import com.rin.englishlearning.common.constants.LessonSourceType;
import com.rin.englishlearning.common.constants.LessonStatus;
import lombok.Data;

@Data
public class LessonFilterRequest {
    private LessonStatus status;
    private CefrLevel languageLevel;
    private LessonSourceType sourceType;
    private String topicSlug;
    private Boolean enableDictation;
    private Boolean enableShadowing;
    private String search; // tìm theo title/slug

}
