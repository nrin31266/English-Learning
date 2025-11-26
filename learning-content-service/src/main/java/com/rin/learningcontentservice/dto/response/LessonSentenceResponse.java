package com.rin.learningcontentservice.dto.response;

import lombok.*;
import java.sql.Timestamp;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LessonSentenceResponse {

    private Long id;
    private Long lessonId;

    private Integer orderIndex;

    private String textRaw;
    private String textDisplay;
    private String translationVi;

    private String phoneticUk;
    private String phoneticUs;

    private Integer audioStartMs;
    private Integer audioEndMs;
    private String audioSegmentUrl;

    private String aiMetadataJson;

    private Boolean isActive;

    private Timestamp createdAt;
    private Timestamp updatedAt;

    private List<LessonWordResponse> lessonWords;
}
