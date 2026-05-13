package com.rin.englishlearning.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VocabSubtopicsGeneratedEvent {
    private String topicId;
    private String topicTitle;
    private int subtopicCount;
    private String topicDescription;
}
