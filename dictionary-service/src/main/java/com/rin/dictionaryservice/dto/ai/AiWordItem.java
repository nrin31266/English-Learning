package com.rin.dictionaryservice.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiWordItem(
        String word,
        String pos
) {
}
