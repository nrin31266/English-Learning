package com.rin.learningcontentservice.dto.metadata.lesson_genaration;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WordAnalyzedDto {
    private Integer orderIndex;
    private String ipaRaw;   // IPA kèm dấu câu
    private String ipa;      // IPA không dấu câu
}