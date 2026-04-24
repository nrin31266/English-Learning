package com.rin.learningcontentservice.dto.metadata.lesson_genaration;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SentenceMetadata {
    private int orderIndex;
    private String phoneticUk;
    private String phoneticUs;
    private String translationVi;
    private List<WordAnalyzedDto> words;  // 👈 DÙNG WordAnalyzedDto
}