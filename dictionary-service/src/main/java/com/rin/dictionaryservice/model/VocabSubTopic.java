package com.rin.dictionaryservice.model;

import com.rin.dictionaryservice.constant.VocabSubTopicStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "vocab_subtopics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@CompoundIndex(name = "subtopic_topic_order_idx", def = "{'topicId': 1, 'order': 1}")
public class VocabSubTopic {

    @Id
    String id;

    String topicId;

    String title;
    String titleVi;
    String description;

    CefrLevel cefrLevel;

    @Builder.Default
    int order = 0;

    @Builder.Default
    int wordCount = 0;

    @Builder.Default
    int readyWordCount = 0;

    @Builder.Default
    VocabSubTopicStatus status = VocabSubTopicStatus.PENDING_WORDS;

    @CreatedDate
    LocalDateTime createdAt;

    @LastModifiedDate
    LocalDateTime updatedAt;
}
