package com.rin.learningcontentservice.dto.response;

import lombok.*;
import java.sql.Timestamp;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LessonWordResponse {

    private Long id;
    private Long sentenceId;

    private Integer orderIndex;

    private String wordText;
    private String wordLower;
    private String wordNormalized;
    private String wordSlug;

    private Integer startCharIndex;
    private Integer endCharIndex;

    private Integer audioStartMs;
    private Integer audioEndMs;

    private Boolean isPunctuation;
    private Boolean isClickable;

    private Timestamp createdAt;
    private Timestamp updatedAt;
}
