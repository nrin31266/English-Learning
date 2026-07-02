package com.rin.dictionaryservice.dto;

import com.rin.dictionaryservice.model.UserVocabWordProgress;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VocabProgressResponse {
    String subtopicId;
    Map<String, UserVocabWordProgress> words;
    int learnedCount;
    int totalWordCount;
    String sessionId;
    boolean rewardExpected;
}
