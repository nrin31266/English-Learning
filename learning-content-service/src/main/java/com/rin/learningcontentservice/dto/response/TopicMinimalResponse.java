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
public class TopicMinimalResponse {
    private Long id;
    private String name;
    private String slug;
}
