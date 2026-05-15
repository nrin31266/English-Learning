package com.rin.dictionaryservice.dto.admin;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WordEntryUsageResponse {
    String entryId;
    String topicId;
    String topicTitle;
    String subtopicId;
    String subtopicTitle;
    String wordKey;
    String wordText;
    String pos;
    boolean wordReady;
    String contextDefinition;
    String contextMeaningVi;
    String contextExample;
    String contextViExample;
    String contextLevel;
}

