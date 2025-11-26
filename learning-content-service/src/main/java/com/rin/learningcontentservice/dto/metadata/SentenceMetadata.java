package com.rin.learningcontentservice.dto.metadata;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SentenceMetadata {
    private int orderIndex;
    private String phoneticUk;
    private String phoneticUs;
    private String translationVi;
}