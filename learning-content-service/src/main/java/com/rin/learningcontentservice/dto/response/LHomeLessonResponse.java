package com.rin.learningcontentservice.dto.response;

import com.rin.englishlearning.common.constants.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LHomeLessonResponse {
    private Long id;
    private String topicSlug;
    private String title;
    private String thumbnailUrl;
    private String slug;
    private CefrLevel languageLevel; // CEFR A1–C2
    private LessonSourceType sourceType; // youtube, audio_file, text…
    private Integer durationSeconds;
    private Boolean enableDictation;
    private Boolean enableShadowing;
}
