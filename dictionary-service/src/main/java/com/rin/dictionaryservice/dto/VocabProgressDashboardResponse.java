package com.rin.dictionaryservice.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VocabProgressDashboardResponse {
    int totalMasteredWords;
    int dueReviewWords;
    Map<String, Integer> activityByDate;
    List<TopicProgress> topics;
    List<SubtopicProgress> subtopics;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TopicProgress {
        String topicId;
        String title;
        String description;
        String thumbnailUrl;
        String cefrRange;
        int subtopicCount;
        int learnedWords;
        int totalWords;
        int dueReviewWords;
        String status;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class SubtopicProgress {
        String subtopicId;
        int learnedWords;
        int totalWords;
        int dueReviewWords;
        String status;
    }
}
