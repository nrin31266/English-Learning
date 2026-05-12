package com.rin.dictionaryservice.model;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "vocab_word_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@CompoundIndex(name = "topic_word_dedup_idx", def = "{'topicId': 1, 'wordKey': 1, 'pos': 1}", unique = true)
@CompoundIndex(name = "subtopic_word_idx", def = "{'subtopicId': 1, 'order': 1}")
@CompoundIndex(name = "word_ready_check_idx", def = "{'wordKey': 1, 'pos': 1, 'wordReady': 1}")
public class VocabWordEntry {

    @Id
    String id;

    String subtopicId;
    String topicId;

    String wordKey;
    String pos;

    @Builder.Default
    int order = 0;

    @Builder.Default
    boolean wordReady = false;

    String note;

    @CreatedDate
    LocalDateTime createdAt;
}
