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
    private String wordNormalized;


    private Integer audioStartMs;
    private Integer audioEndMs;

    private Boolean hasPunctuation;
    private Boolean isClickable;


    private Timestamp createdAt;
    private Timestamp updatedAt;

    private String posTag;
    private String entityType;
    private String lemma;
}
