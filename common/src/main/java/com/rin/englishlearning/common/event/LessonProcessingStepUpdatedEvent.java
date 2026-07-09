package com.rin.englishlearning.common.event;

import com.rin.englishlearning.common.constants.LessonProcessingStep;
import com.rin.englishlearning.common.constants.SourceLicenseType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Minimal progress event from AI service → LearningContentService.
 * LCS updates processingStep and can derive status:
 *  - COMPLETED -> ready
 *  - FAILED    -> error
 *  - others    -> processing
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LessonProcessingStepUpdatedEvent {


    private LessonProcessingStep processingStep;

    private String aiJobId;

    /** Optional debug info */
    private String aiMessage;

    private String audioUrl;

    private String sourceReferenceId;

    private String thumbnailUrl;

    private Boolean isSkip;
//    duration
    private Integer durationSeconds;

    private String aiMetadataUrl;

    private String title;

    private String slug;

    private String description;

    private String languageLevel;

    private String sourceLanguage;

    private SourceLicenseType sourceLicenseType;
}
