package com.rin.learningcontentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class ShadowingScoreResponse {
    Long attemptId;
    Boolean attemptCompleted;
    Boolean lessonCompleted;
}
