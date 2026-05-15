package com.rin.dictionaryservice.model;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "vocab_progress")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@CompoundIndex(name = "user_topic", def = "{'userId': 1, 'topicId': 1}")
public class VocabProgress {
    @Id
    String id;
    String userId;
    String wordEntryId;
    String subtopicId;
    String topicId;
    String status;          // new | learning | reviewing | mastered
    int correctCount;
    int wrongCount;
    long lastReviewedAt;
}
