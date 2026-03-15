package com.rin.learningcontentservice.dto.metadata.lesson_genaration;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WordMetadata {
    private String word;
    private Double start;
    private Double end;
    private Double score;
}