package com.rin.dictionaryservice.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiWordsPayload(
        List<AiWordItem> words
) {
}
