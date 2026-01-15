package com.rin.englishlearning.common.event;

import com.rin.englishlearning.common.dto.DefinitionDto;
import com.rin.englishlearning.common.dto.PhoneticsDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class WordAnalyzedEvent {
    private String word;
    private String displayWord;
    private Boolean isValidWord;
    private String wordType;
    private String cefrLevel;
    private PhoneticsDto phonetics;
    private java.util.List<DefinitionDto> definitions;
}

