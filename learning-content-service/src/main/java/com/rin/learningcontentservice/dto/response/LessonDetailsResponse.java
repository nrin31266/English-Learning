package com.rin.learningcontentservice.dto.response;

import com.rin.englishlearning.common.constants.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class LessonDetailsResponse {
    private Long id;
    private TopicMinimalResponse topic;
    private String title;
    private String thumbnailUrl;
    private String slug;
    private String description;
    private LessonType lessonType; // ai_assisted, traditional
    private LessonProcessingStep processingStep;
    private CefrLevel languageLevel; // CEFR A1–C2
    private LessonSourceType sourceType; // youtube, audio_file, text…
    private String sourceUrl;
    private String audioUrl;
    private String sourceReferenceId;  // YouTube video ID, internal file ID…
    private String sourceLanguage; // e.g. en-US, en-UK
    private Integer durationSeconds;
    private Integer totalSentences;
    private LessonStatus status; // draft, processing, ready, error…
    private String aiJobId;
    private Boolean enableDictation;
    private Boolean enableShadowing;
    private Timestamp createdAt;
    private Timestamp updatedAt;
    private Timestamp publishedAt;
    private List<LessonSentenceResponse> lessonSentences;
}
