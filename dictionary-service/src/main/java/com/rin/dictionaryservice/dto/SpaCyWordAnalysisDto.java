package com.rin.dictionaryservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
@Builder
public class SpaCyWordAnalysisDto {
    String text;
    String lemma;
    String pos;
    String tag;
    String dep;

    @JsonProperty("ent_type")
    String entType;
}
