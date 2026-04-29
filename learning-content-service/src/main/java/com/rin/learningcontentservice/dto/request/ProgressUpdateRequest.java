package com.rin.learningcontentservice.dto.request;


import com.rin.learningcontentservice.model.LearningMode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProgressUpdateRequest {
    @NotNull(message = "Lesson ID cannot be null")
    private Long lessonId;

    @NotNull(message = "Sentence ID cannot be null")
    private Long sentenceId;

    @NotNull(message = "Learning mode cannot be null")
    private LearningMode mode;

    @NotNull(message = "Score cannot be null")
    private Double score; // Dùng chung: với Shadowing là weightedAccuracy, với Dictation có thể là % đúng
}