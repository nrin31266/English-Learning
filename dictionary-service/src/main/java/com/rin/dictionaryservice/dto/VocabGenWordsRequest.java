package com.rin.dictionaryservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class VocabGenWordsRequest {
    @JsonProperty("topic_title")            String topicTitle;
    @JsonProperty("subtopic_title")         String subtopicTitle;
    @JsonProperty("subtopic_description")   String subtopicDescription;
    @JsonProperty("cefr_level")             String cefrLevel;
    @JsonProperty("existing_keys")          List<String> existingKeys;
}
