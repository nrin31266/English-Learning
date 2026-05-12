package com.rin.dictionaryservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VocabGenSubtopicsRequest {
    @JsonProperty("topic_title")  String topicTitle;
    @JsonProperty("description")  String description;
    @JsonProperty("cefr_range")   String cefrRange;
    @JsonProperty("n")            int n;
}
