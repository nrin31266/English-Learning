package com.rin.dictionaryservice.dto;

import com.rin.dictionaryservice.constant.VocabSubTopicStatus;
import com.rin.dictionaryservice.model.CefrLevel;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class VocabSubTopicResponse {
    String id;
    String topicId;
    String title;
    String titleVi;
    String description;
    CefrLevel cefrLevel;
    int order;
    int wordCount;
    int readyWordCount;
    VocabSubTopicStatus status;
    LocalDateTime createdAt;
}
