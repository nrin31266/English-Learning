package com.rin.englishlearning.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VocabSubTopicReadyEvent {
    private String topicId;
    private String subtopicId;
    private String subtopicTitle;
    private String topicTitle;
    private boolean topicReady;
    private int readyWordCount;
    private int wordCount;
    private int readySubtopicCount;
}
