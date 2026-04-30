package com.rin.learningcontentservice.dto.request;

import com.rin.learningcontentservice.model.LearningMode;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class ProgressBatchRequest {
    @NotNull
    private Long lessonId;

    @NotEmpty // Đảm bảo danh sách không trống
    private List<Long> sentenceIds;

    @NotNull
    private LearningMode mode; // SHADOWING, DICTATION...

    private Double score;
}