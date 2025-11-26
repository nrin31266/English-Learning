package com.rin.learningcontentservice.dto.metadata;


import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Segment {
    private double start;
    private double end;
    private String text;
    private java.util.List<Word> words;
}