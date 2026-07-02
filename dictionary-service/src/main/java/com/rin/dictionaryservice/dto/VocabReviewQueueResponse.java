package com.rin.dictionaryservice.dto;

import com.rin.dictionaryservice.model.UserVocabWordProgress;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VocabReviewQueueResponse {
    int totalDue;
    List<ReviewWord> words;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ReviewWord {
        String subtopicId;
        VocabWordEntryResponse word;
        UserVocabWordProgress progress;
    }
}
