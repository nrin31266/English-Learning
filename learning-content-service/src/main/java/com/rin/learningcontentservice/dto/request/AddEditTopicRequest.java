package com.rin.learningcontentservice.dto.request;

import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class AddEditTopicRequest {
    private String name;
    private String description;
    Boolean isActive =false;
    String color; // Highlight topic
}
