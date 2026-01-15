package com.rin.englishlearning.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PhoneticsDto{

    private String us;
    private String uk;
    private String audioUs;
    private String audioUk;
}