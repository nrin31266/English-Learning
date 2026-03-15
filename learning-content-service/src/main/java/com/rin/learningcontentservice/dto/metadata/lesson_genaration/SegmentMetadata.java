package com.rin.learningcontentservice.dto.metadata.lesson_genaration;


import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SegmentMetadata {
    private Double start;
    private Double end;
    private String text;
    private java.util.List<WordMetadata> words;
}