package com.rin.englishlearning.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DefinitionDto{
    private String type;
    private String definition;
    private String vietnamese;
    private String example;

}
