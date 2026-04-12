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
public class DictionaryApiResponse {
    String word;
    String phonetic;
    List<Phonetic> phonetics;
    List<Meaning> meanings;
    License license;
    List<String> sourceUrls;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Phonetic {
        String text;
        String audio;
        String sourceUrl;
        License license;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Meaning {
        String partOfSpeech;
        List<Definition> definitions;
        List<String> synonyms;
        List<String> antonyms;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Definition {
        String definition;
        List<String> synonyms;
        List<String> antonyms;
        String example;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class License {
        String name;
        String url;
    }
}