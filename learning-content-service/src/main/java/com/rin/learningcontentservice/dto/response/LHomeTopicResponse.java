package com.rin.learningcontentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LHomeTopicResponse {
    private Long id;
    private String name;
    private String slug;
    private List<LHomeLessonResponse> lessons;
}
