package com.rin.dictionaryservice.dto;

import com.rin.dictionaryservice.constant.VocabTopicStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class VocabTopicResponse {
    String id;
    String title;
    String description;
    List<String> tags;
    String cefrRange;
    int estimatedWordCount;
    int subtopicCount;
    int readySubtopicCount;
    VocabTopicStatus status;
    String thumbnailUrl;
    LocalDateTime publishedAt;
    LocalDateTime createdAt;
}
