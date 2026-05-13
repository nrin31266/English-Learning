package com.rin.dictionaryservice.model;

import com.rin.dictionaryservice.constant.VocabTopicStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "vocab_topics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VocabTopic {

    @Id
    String id;

    String title;
    String description;

    List<String> tags;

    String cefrRange;
    int estimatedWordCount;

    @Builder.Default
    int subtopicCount = 0;

    @Builder.Default
    int readySubtopicCount = 0;

    @Builder.Default
    VocabTopicStatus status = VocabTopicStatus.DRAFT;

    @Builder.Default
    boolean isActive = false;

    String thumbnailUrl;
    LocalDateTime publishedAt;

    @CreatedDate
    LocalDateTime createdAt;

    @LastModifiedDate
    LocalDateTime updatedAt;
}
