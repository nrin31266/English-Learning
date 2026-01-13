package com.rin.englishlearning.common.event;

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
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
class PhoneticsDto{

    private String us;
    private String uk;
    private String audioUs;
    private String audioUk;
}
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
class DefinitionDto{
    private String type;
    private String definition;
    private String vietnamese;
    private String example;

}
