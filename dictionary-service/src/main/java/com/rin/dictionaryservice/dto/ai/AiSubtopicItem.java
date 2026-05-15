package com.rin.dictionaryservice.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiSubtopicItem(
        String title,
        @JsonAlias("title_vi") String titleVi,
        String description,
        @JsonAlias("cefr_level") String cefrLevel
) {
}
