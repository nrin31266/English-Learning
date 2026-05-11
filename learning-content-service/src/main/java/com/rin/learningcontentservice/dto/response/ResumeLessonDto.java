package com.rin.learningcontentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResumeLessonDto {
    private Long id;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private String languageLevel;
    private String sourceType;
    private Integer durationSeconds;
    private Boolean enableDictation;
    private Boolean enableShadowing;
    private String mode;
    private Integer progressPercent;
    private Integer activeSentenceCount;
}
