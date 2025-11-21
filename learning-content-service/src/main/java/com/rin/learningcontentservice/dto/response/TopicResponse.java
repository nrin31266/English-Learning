package com.rin.learningcontentservice.dto.response;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class TopicResponse {
    private Long id;
    private String name;
    private String slug;
    private String description;
    Boolean isActive =false;
    String color; // Highlight topic
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long lessonCount;
}
