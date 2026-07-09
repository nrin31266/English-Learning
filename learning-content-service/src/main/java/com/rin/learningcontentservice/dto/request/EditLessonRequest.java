package com.rin.learningcontentservice.dto.request;

import com.rin.englishlearning.common.constants.CefrLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class EditLessonRequest {
    private String title;
    private String description;
    private String dictationHint;
    private CefrLevel languageLevel;
    private String sourceLanguage;
    private String thumbnailUrl;
    private Boolean enableDictation;
    private Boolean enableShadowing;
}
