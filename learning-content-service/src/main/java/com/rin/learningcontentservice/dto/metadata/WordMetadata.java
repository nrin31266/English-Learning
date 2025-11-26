package com.rin.learningcontentservice.dto.metadata;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Word {
    private String word;
    private double start;
    private double end;
    private double score;
}