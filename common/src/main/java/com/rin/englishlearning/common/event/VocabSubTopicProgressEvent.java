package com.rin.englishlearning.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VocabSubTopicProgressEvent {
    private String topicId;
    private String subtopicId;
    private String subtopicTitle;
    private int readyWordCount;
    private int wordCount;
    private String subtopicStatus; // PROCESSING_WORDS or READY
}
