package com.rin.dictionaryservice.model;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@Document(collection = "user_vocab_progress")
@CompoundIndex(name = "user_subtopic_unique_idx", def = "{'userId': 1, 'subtopicId': 1}", unique = true)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserVocabProgress {
    @Id String id;
    String userId;
    String subtopicId;
    @Builder.Default Map<String, UserVocabWordProgress> words = new HashMap<>();
    @Builder.Default Map<String, Integer> activityByDate = new HashMap<>();
    /** Lifetime reward watermark used to prevent duplicate rewards. */
    @Builder.Default Map<String, Integer> rewardedScores = new HashMap<>();
    @Builder.Default Map<String, Integer> processedSessions = new LinkedHashMap<>();
    /** Denormalized DONE count for dashboard reads; null means a legacy document. */
    Integer masteredWordCount;
    Instant updatedAt;
    @Version Long version;
}
