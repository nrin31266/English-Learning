package com.rin.dictionaryservice.dto;

import com.rin.dictionaryservice.model.VocabLearningMode;
import com.rin.dictionaryservice.model.VocabReviewRating;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class VocabSessionWordRequest {
    @NotBlank String wordId;
    @NotNull VocabReviewRating rating;
    @Size(max = 4) Set<VocabLearningMode> completedModes;
}
