package com.rin.learningcontentservice.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MergeSentenceRequest {
    private Long sentence1Id;
    private Long sentence2Id;
}
