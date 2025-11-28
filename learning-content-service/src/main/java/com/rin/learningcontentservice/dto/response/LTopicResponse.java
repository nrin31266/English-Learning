package com.rin.learningcontentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class LTopicResponse {
    private Long id;
    private String name;
    private String slug;
    private LocalDateTime updatedAt;
    private Long totalLessons;
    private List<LHomeLessonResponse> lessons;
}
