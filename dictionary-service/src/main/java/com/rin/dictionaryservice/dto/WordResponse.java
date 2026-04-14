package com.rin.dictionaryservice.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WordResponse {

    String word;
    String pos;
    PhoneticsDto phonetics;
    List<DefinitionDto> definitions;
    Boolean isPlaceholder; // du lieu tam tu (dictionaryapi.dev)
    String message;
    WordResponseStatus status; // 🔥 thêm cái này
    String summaryVi; // nghĩa Vi tóm tắt

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class PhoneticsDto {
        String uk;
        String ukAudioUrl;
        String us;
        String usAudioUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DefinitionDto {
        String definition;   // EN
        String meaningVi;    // VI
        String example;
    }

}