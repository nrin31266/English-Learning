package com.rin.dictionaryservice.dto.admin;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WordDefinitionDto {
    String definition;
    String meaningVi;
    String example;
    String viExample;
    String level;
    Boolean exampleContainsExactWord;
}

