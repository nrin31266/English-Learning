package com.rin.dictionaryservice.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiSubtopicsPayload(
        @JsonAlias({"topicDescription", "topic_description"})
        String topicDescription,
        List<AiSubtopicItem> subtopics
) {
}
