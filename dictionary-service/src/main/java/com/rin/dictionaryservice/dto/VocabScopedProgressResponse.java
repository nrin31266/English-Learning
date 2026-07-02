package com.rin.dictionaryservice.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VocabScopedProgressResponse {
    List<VocabProgressDashboardResponse.TopicProgress> topics;
    List<VocabProgressDashboardResponse.SubtopicProgress> subtopics;
}
