package com.rin.dictionaryservice.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiSingleMeaningPayload(
        String definition,
        @JsonAlias({"meaningVi", "meaning_vi"}) String meaningVi,
        String example,
        @JsonAlias({"viExample", "vi_example"}) String viExample,
        String level
) {
}
