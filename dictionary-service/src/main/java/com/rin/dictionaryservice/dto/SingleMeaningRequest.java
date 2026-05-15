package com.rin.dictionaryservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SingleMeaningRequest {
    @JsonProperty("word") String word;
    @JsonProperty("pos") String pos;
    @JsonProperty("topic_title") String topicTitle;
    @JsonProperty("topic_description") String topicDescription;
    @JsonProperty("subtopic_title") String subtopicTitle;
    @JsonProperty("subtopic_description") String subtopicDescription;
}
